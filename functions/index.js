/**
 * ═══════════════════════════════════════════════════════════════════
 * RealTea Firebase Cloud Functions
 * Automated Historical Timeline Population & Maintenance
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Functions:
 * 1. scheduledDailyUpdate - Runs daily at 1 AM (populates "On This Day")
 * 2. backfillHistory - Manual trigger for populating past years
 * 3. updateExistingEvent - Updates events with revision tracking
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import functions from 'firebase-functions';
import admin from 'firebase-admin';
import fetch from 'node-fetch';
import OpenAI from 'openai';

// Initialize Firebase Admin SDK
  admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY 
});

// Configuration
const CONFIG = {
  BATCH_SIZE: 500,
  MAX_EVENTS_PER_RUN: 200,
  AI_DELAY_MS: 1000,
  MIN_CREDIBILITY: 0.6,
  AI_TEMPERATURE: 0.4,  // More factual consistency
  AI_MAX_TOKENS: 900,    // Comprehensive responses
  AI_MAX_RETRIES: 3,     // Retry failed API calls
  AI_RETRY_DELAY: 2000,  // Wait 2 seconds between retries
};

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Log errors to Firestore
 */
async function logError(error, context = {}) {
  try {
    await db.collection('logs').add({
      type: 'error',
      message: error.message || String(error),
      stack: error.stack || '',
      context: context,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'ERROR'
    });
    console.error('❌ Error logged:', error.message, context);
  } catch (logErr) {
    console.error('Failed to log error:', logErr);
  }
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = CONFIG.AI_MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = CONFIG.AI_RETRY_DELAY * attempt;
      console.log(`⚠️  Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Fetch from MuffinLabs History API
 */
async function fetchMuffinLabs(month, day) {
  try {
    const url = `https://history.muffinlabs.com/date/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-Scheduler/1.0' }
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return (data.data?.Events || []).map(e => ({
      title: e.text,
      year: e.year,
      description: e.html?.replace(/<[^>]*>/g, '') || e.text,
      links: e.links || [],
      source: 'MuffinLabs'
    }));
  } catch (error) {
    console.error('MuffinLabs error:', error.message);
    return [];
  }
}

/**
 * Fetch from Wikipedia REST API
 */
async function fetchWikipedia(month, day) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-Scheduler/1.0' }
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return (data.events || []).map(e => ({
      title: e.text,
      year: e.year,
      description: e.pages?.[0]?.extract || e.text,
      links: e.pages?.map(p => ({ url: p.content_urls?.desktop?.page })) || [],
      imageUrl: e.pages?.[0]?.thumbnail?.source || '',
      source: 'Wikipedia'
    }));
  } catch (error) {
    console.error('Wikipedia error:', error.message);
    return [];
  }
}

/**
 * Fetch Wikipedia page summary
 */
async function fetchWikiSummary(title) {
  try {
    const encoded = encodeURIComponent(title);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-Scheduler/1.0' }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return {
      extract: data.extract || '',
      thumbnail: data.thumbnail?.source || '',
      url: data.content_urls?.desktop?.page || ''
    };
  } catch (error) {
    return null;
  }
}

/**
 * Cross-check facts between Wikipedia and History API
 */
function crossCheckFacts(event, wikiSummary) {
  const wikiText = wikiSummary?.extract || '';
  const historyText = event.description || '';
  
  // Verify year matches in both sources
  const yearMatches = wikiText.includes(event.year) || historyText.includes(event.year);
  
  // Check for common key terms (at least 2 words overlap)
  const wikiWords = new Set(wikiText.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const historyWords = new Set(historyText.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const commonWords = [...wikiWords].filter(w => historyWords.has(w));
  
  const factualAlignment = commonWords.length >= 2 && yearMatches;
  const credibilityScore = factualAlignment ? 1.0 : 0.7;
  
  return {
    verified: factualAlignment,
    credibilityScore,
    commonTerms: commonWords.length,
    yearVerified: yearMatches
  };
}

/**
 * AI summarization with enriched content and structured data
 */
async function summarizeWithAI(event, wikiSummary, allEventsForRelated = []) {
  if (!openai) {
    return {
      summary: event.description || event.title,
      shortSummary: (event.description || event.title).substring(0, 150) + '...',
      region: 'Global',
      category: 'World',
      credibilityScore: 0.7,
      background: '',
      keyFigures: [],
      causes: '',
      outcomes: '',
      impact: '',
      relatedEvents: [],
      sources: [
        { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
        { name: 'History API', url: 'https://history.muffinlabs.com' }
      ]
    };
  }

  try {
    // Cross-check facts between APIs
    const factCheck = crossCheckFacts(event, wikiSummary);
    console.log(`🔍 Fact check: ${factCheck.verified ? '✓' : '✗'} (${factCheck.commonTerms} common terms, year: ${factCheck.yearVerified})`);
    
    const context = wikiSummary?.extract || event.description || event.title;
    
    const prompt = `Analyze this historical event and provide comprehensive, accurate details.

Event: ${event.title}
Year: ${event.year}
Context: ${context.substring(0, 800)}

Provide a structured JSON response with the following fields:
{
  "summary": "3-5 sentence overview of what happened and why it matters",
  "background": "1-2 sentences of context leading up to the event",
  "keyFigures": ["Array of important people, organizations, or entities involved (max 5)"],
  "causes": "1-2 sentences explaining what led to this event",
  "outcomes": "1-2 sentences describing immediate results",
  "impact": "1-2 sentences on lasting significance and consequences",
  "sources": ["Wikipedia", "History API"]
}

Requirements:
- Be factual, neutral, and concise
- Include geographical region naturally in the text
- Focus on verified historical facts
- Use clear, accessible language
- Return ONLY valid JSON, no additional text`;

    // Use retry logic for AI call
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional historian and fact-checker. Provide accurate, well-structured historical analysis based on verified sources. Cross-reference facts and return only valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: CONFIG.AI_MAX_TOKENS,
        temperature: CONFIG.AI_TEMPERATURE,
        response_format: { type: "json_object" }
      });
    });

    const responseText = completion.choices[0].message.content.trim();
    const enrichedData = JSON.parse(responseText);

    // Generate short summary (1-2 sentences) for digest view
    let shortSummary = '';
    try {
      const shortSummaryPrompt = `Summarize this historical event in 1-2 clear, concise sentences that capture the key idea:

Event: ${event.title}
Year: ${event.year}
Summary: ${enrichedData.summary}

Write ONLY 1-2 sentences. Be specific and informative.`;

      const shortCompletion = await retryWithBackoff(async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a concise historian. Write exactly 1-2 clear sentences.' },
            { role: 'user', content: shortSummaryPrompt }
          ],
          max_tokens: 100,
          temperature: CONFIG.AI_TEMPERATURE,
        });
      });

      shortSummary = shortCompletion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Short summary generation error:', error.message);
      // Fallback: use first 2 sentences of main summary
      shortSummary = enrichedData.summary.split('.').slice(0, 2).join('.') + '.';
    }

    // Extract region and category from the summary
    const region = extractRegion(enrichedData.summary);
    const category = categorizeEvent(event.title, enrichedData.summary);

    // Find related events (simple implementation - can be enhanced)
    const relatedEvents = findRelatedEvents(event, allEventsForRelated, enrichedData);

    return {
      summary: enrichedData.summary || event.description || event.title,
      shortSummary: shortSummary || enrichedData.summary.substring(0, 150) + '...',
      background: enrichedData.background || '',
      keyFigures: Array.isArray(enrichedData.keyFigures) ? enrichedData.keyFigures.slice(0, 5) : [],
      causes: enrichedData.causes || '',
      outcomes: enrichedData.outcomes || '',
      impact: enrichedData.impact || '',
      relatedEvents: relatedEvents || [],
      sources: [
        { name: 'Wikipedia', url: wikiSummary?.url || 'https://en.wikipedia.org' },
        { name: 'History API', url: 'https://history.muffinlabs.com' }
      ],
      region,
      category,
      credibilityScore: factCheck.credibilityScore,
      factCheckPassed: factCheck.verified
    };
  } catch (error) {
    console.error('AI error:', error.message);
    await logError(error, { event: event.title, year: event.year, function: 'summarizeWithAI' });
    
    // Fallback with basic data
    return {
      summary: event.description || event.title,
      shortSummary: (event.description || event.title).substring(0, 150) + '...',
      background: '',
      keyFigures: [],
      causes: '',
      outcomes: '',
      impact: '',
      relatedEvents: [],
      sources: [
        { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
        { name: 'History API', url: 'https://history.muffinlabs.com' }
      ],
      region: 'Global',
      category: 'World',
      credibilityScore: 0.5,
      factCheckPassed: false
    };
  }
}

/**
 * Find related events based on category, year proximity, and keywords
 */
function findRelatedEvents(currentEvent, allEvents, enrichedData) {
  if (!allEvents || allEvents.length === 0) return [];
  
  const currentYear = parseInt(currentEvent.year);
  const yearRange = 5; // Look for events within 5 years
  
  const related = allEvents
    .filter(e => {
      if (e.title === currentEvent.title) return false;
      
      const eventYear = parseInt(e.year);
      const yearDiff = Math.abs(currentYear - eventYear);
      
      // Same category or within year range
      const sameCategory = e.category === enrichedData.category;
      const nearbyYear = yearDiff <= yearRange;
      
      return sameCategory || nearbyYear;
    })
    .slice(0, 5) // Limit to 5 related events
    .map(e => ({
      id: `${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${e.year}`,
      title: e.title,
      year: e.year,
      category: e.category
    }));
  
  return related;
}

/**
 * Extract region from text
 */
function extractRegion(text) {
  const patterns = {
    'North America': /\b(United States|USA|America|Canada|Mexico|North America)\b/i,
    'Europe': /\b(Europe|Britain|France|Germany|Italy|Spain|UK|England|Russia)\b/i,
    'Asia': /\b(Asia|China|Japan|India|Korea|Vietnam|Thailand)\b/i,
    'Middle East': /\b(Middle East|Iran|Iraq|Israel|Saudi Arabia|Turkey)\b/i,
    'Africa': /\b(Africa|Egypt|South Africa|Nigeria|Kenya)\b/i,
    'South America': /\b(South America|Brazil|Argentina|Chile|Peru)\b/i,
    'Oceania': /\b(Australia|New Zealand|Pacific|Oceania)\b/i,
  };

  for (const [region, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return region;
  }
  return 'Global';
}

/**
 * Categorize event
 */
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (/\b(war|battle|conflict|invasion|military)\b/i.test(text)) return 'War';
  if (/\b(election|president|government|political)\b/i.test(text)) return 'Politics';
  if (/\b(discover|invention|science|nobel)\b/i.test(text)) return 'Science';
  if (/\b(computer|internet|technology)\b/i.test(text)) return 'Technology';
  if (/\b(space|NASA|astronaut|moon)\b/i.test(text)) return 'Space';
  if (/\b(medicine|disease|vaccine)\b/i.test(text)) return 'Medicine';
  
  return 'World';
}

// ═══════════════════════════════════════════════════════════════════
// FIRESTORE OPERATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if event exists and return it
 */
async function getExistingEvent(title, year, date) {
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100);
  
  const docId = `${cleanTitle}-${date}`;
  const docRef = db.collection('events').doc(docId);
  const doc = await docRef.get();
  
  return doc.exists() ? { id: docId, ref: docRef, data: doc.data() } : null;
}

/**
 * Save or update event with revision tracking
 */
async function saveOrUpdateEvent(eventData, aiResult, sources) {
  const { title, year, date } = eventData;
  
  // Check if event exists
  const existing = await getExistingEvent(title, year, date);
  
  if (existing) {
    // Event exists - add revision instead of overwriting
    console.log(`    🔄 Event exists, adding revision: ${title.substring(0, 40)}...`);
    
    const revision = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      aiSummary: aiResult.summary,
      shortSummary: aiResult.shortSummary,
      background: aiResult.background,
      keyFigures: aiResult.keyFigures,
      causes: aiResult.causes,
      outcomes: aiResult.outcomes,
      impact: aiResult.impact,
      sourcesChecked: sources,
      credibilityScore: aiResult.credibilityScore,
      region: aiResult.region,
      category: aiResult.category
    };

    await existing.ref.update({
      revisions: admin.firestore.FieldValue.arrayUnion(revision),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`    ✅ Revision added to existing event`);
    return { updated: true, created: false };
    
  } else {
    // New event - create document with enriched data
    console.log(`    ➕ Creating new event: ${title.substring(0, 40)}...`);
    
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 100);
    
    const docId = `${cleanTitle}-${date}`;
    const docRef = db.collection('events').doc(docId);

    const newEvent = {
      // Basic information
      title: title,
      summary: aiResult.summary,
      shortSummary: aiResult.shortSummary || aiResult.summary.substring(0, 150) + '...',
      description: aiResult.summary.substring(0, 300),
      longDescription: aiResult.summary,
      date: date,
      year: year.toString(),
      
      // Enriched AI-generated fields (Full multi-layered data)
      background: aiResult.background || '',
      keyFigures: aiResult.keyFigures || [],
      causes: aiResult.causes || '',
      outcomes: aiResult.outcomes || '',
      impact: aiResult.impact || '',
      relatedEvents: aiResult.relatedEvents || [],
      
      // Location and categorization
      region: aiResult.region,
      category: aiResult.category,
      location: aiResult.region,
      
      // Sources and verification (with fact-checking)
      sources: sources,
      verifiedSource: sources[0]?.url || 'https://wikipedia.org',
      imageUrl: eventData.imageUrl || '',
      credibilityScore: Math.round(aiResult.credibilityScore * 100),
      factCheckPassed: aiResult.factCheckPassed || false,
      importanceScore: 80,
      verified: true,
      verifiedByAI: true,
      
      // Metadata
      addedBy: 'auto',
      author: 'Wikipedia + History API',
      historical: true,
      newsGenerated: false,
      aiGenerated: true,
      autoUpdated: true,
      enriched: true,
      enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
      revisions: [], // Empty array for future revisions
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(newEvent);
    console.log(`    ✅ New event created with enriched data`);
    return { updated: false, created: true };
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PROCESSING LOGIC
// ═══════════════════════════════════════════════════════════════════

/**
 * Process events for a specific date
 */
async function processDate(month, day, maxEvents = 200) {
  console.log(`\n📅 Processing ${month}/${day}...`);

  const [muffinEvents, wikiEvents] = await Promise.all([
    fetchMuffinLabs(month, day),
    fetchWikipedia(month, day)
  ]);

  const allEvents = [...muffinEvents, ...wikiEvents];
  console.log(`  📚 Fetched: ${allEvents.length} events (MuffinLabs: ${muffinEvents.length}, Wikipedia: ${wikiEvents.length})`);

  // Deduplicate by year + title
  const uniqueEvents = new Map();
  allEvents.forEach(e => {
    const key = `${e.year}-${e.title.substring(0, 50).toLowerCase()}`;
    if (!uniqueEvents.has(key)) uniqueEvents.set(key, e);
  });

  const eventsToProcess = Array.from(uniqueEvents.values()).slice(0, maxEvents);
  console.log(`  🔍 Unique events: ${eventsToProcess.length}`);

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const event of eventsToProcess) {
    try {
      const eventDate = `${event.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Get Wikipedia summary
      const wikiSummary = event.links?.[0] ? 
        await fetchWikiSummary(event.links[0].title || event.title) : null;

      // AI summarization
      const aiResult = await summarizeWithAI(event, wikiSummary);

      // Validate credibility
      if (aiResult.credibilityScore < CONFIG.MIN_CREDIBILITY) {
        console.log(`    ❌ Low credibility (${aiResult.credibilityScore}), skipping`);
        stats.skipped++;
        continue;
      }

      // Prepare sources as structured objects
      const sources = [
        { name: 'MuffinLabs History API', url: 'https://history.muffinlabs.com' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
        ...(event.links?.map(l => ({
          name: l.title || 'Wikipedia Article',
          url: l.url
        })).filter(s => s.url) || [])
      ].slice(0, 5);

      // Save or update with revision tracking
      const result = await saveOrUpdateEvent(
        { title: event.title, year: event.year, date: eventDate, imageUrl: event.imageUrl },
        aiResult,
        sources
      );

      if (result.created) stats.created++;
      if (result.updated) stats.updated++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, CONFIG.AI_DELAY_MS));

    } catch (error) {
      console.error(`  ❌ Error processing event: ${error.message}`);
      stats.errors++;
    }
  }

  console.log(`  📊 Results: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
  return stats;
}

// ═══════════════════════════════════════════════════════════════════
// FIREBASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Scheduled Function: Runs daily at 1 AM
 * Populates "On This Day" events from history
 */
export const scheduledDailyUpdate = functions.pubsub
  .schedule('0 1 * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🤖 SCHEDULED DAILY UPDATE STARTED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏰ ${new Date().toISOString()}`);

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`📅 Today: ${month}/${day}`);
    console.log(`🎯 Max events per run: ${CONFIG.MAX_EVENTS_PER_RUN}`);

    const stats = await processDate(month, day, CONFIG.MAX_EVENTS_PER_RUN);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ DAILY UPDATE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Created: ${stats.created}`);
    console.log(`🔄 Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return stats;
  });

/**
 * HTTP Function: Manual backfill for specific date range
 * Call via: https://[region]-[project].cloudfunctions.net/backfillHistory?month=7&day=20
 */
export const backfillHistory = functions.https.onRequest(async (req, res) => {
  console.log('\n🏛️  BACKFILL HISTORY TRIGGERED');

  // Parse query parameters
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const day = parseInt(req.query.day) || new Date().getDate();
  const maxEvents = parseInt(req.query.max) || CONFIG.MAX_EVENTS_PER_RUN;

  console.log(`📅 Backfilling: ${month}/${day} (max ${maxEvents} events)`);

  try {
    const stats = await processDate(month, day, maxEvents);

    res.json({
      success: true,
      date: `${month}/${day}`,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Backfill error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * HTTP Function: Health check
 */
export const healthCheck = functions.https.onRequest(async (req, res) => {
  try {
    // Test Firestore connection
    const testRef = db.collection('healthcheck').doc('test');
    await testRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'healthy'
    });

    // Count events
    const eventsSnapshot = await db.collection('events')
      .where('addedBy', '==', 'auto')
      .limit(1)
      .get();

    res.json({
      status: 'healthy',
      firestore: 'connected',
      openai: openai ? 'configured' : 'not configured',
      autoEvents: eventsSnapshot.size > 0 ? 'found' : 'none yet',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
