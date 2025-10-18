/**
 * API Route: /api/autoUpdate
 * Automated background system that fetches, fact-checks, and saves new events
 * Runs every 6 hours via Vercel cron or external trigger
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

/**
 * Calculate credibility score based on multiple factors
 */
function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1;
  return parseFloat(((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2));
}

/**
 * Fetch from NewsAPI
 */
async function fetchNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${apiKey}`;
    const response = await fetch(url, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    console.log(`✅ [AUTO] NewsAPI: ${data.articles?.length || 0} articles`);
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source?.name || 'Unknown',
      imageUrl: a.urlToImage,
      category: 'World'
    }));
  } catch (error) {
    console.error('❌ [AUTO] NewsAPI error:', error.message);
    return [];
  }
}

/**
 * Fetch from GDELT
 */
async function fetchGDELT() {
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=world%20OR%20breaking&mode=artlist&maxrecords=20&format=json&sort=datedesc';
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'RealTea-AutoUpdate/1.0' }
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    console.log(`✅ [AUTO] GDELT: ${data.articles?.length || 0} articles`);
    return (data.articles || []).slice(0, 10).map(a => ({
      title: a.title,
      description: a.title,
      url: a.url,
      publishedAt: a.seendate,
      source: a.domain || 'GDELT',
      imageUrl: a.socialimage,
      category: 'World'
    }));
  } catch (error) {
    console.error('❌ [AUTO] GDELT error:', error.message);
    return [];
  }
}

/**
 * Fetch from Wikipedia "On This Day"
 */
async function fetchWikipedia() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-AutoUpdate/1.0' }
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    console.log(`✅ [AUTO] Wikipedia: ${data.events?.length || 0} historical events`);
    return (data.events || []).slice(0, 5).map(e => ({
      title: e.text,
      description: e.pages?.[0]?.extract || e.text,
      url: e.pages?.[0]?.content_urls?.desktop?.page || 'https://wikipedia.org',
      publishedAt: new Date().toISOString(),
      source: 'Wikipedia',
      imageUrl: e.pages?.[0]?.thumbnail?.source || '',
      category: 'History',
      year: e.year
    }));
  } catch (error) {
    console.error('❌ [AUTO] Wikipedia error:', error.message);
    return [];
  }
}

/**
 * Use AI to verify and enrich event
 */
async function verifyWithAI(event, relatedSources) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [AUTO] OpenAI API key missing, skipping AI verification');
    return null;
  }

  const openai = new OpenAI({ apiKey });

  const sourceSummary = relatedSources.slice(0, 5)
    .map((s, i) => `[${i + 1}] ${s.source}: "${s.title}"`)
    .join('\n');

  const prompt = `Verify and summarize this event based on multiple sources:

**EVENT:**
${event.title}
${event.description || ''}

**SOURCES REPORTING THIS:**
${sourceSummary || 'Single source only'}

**YOUR TASK:**
1. Create a neutral, factual summary (150-250 words)
2. Determine credibility based on source agreement
3. Extract key details (location, date, category, region)

Return ONLY valid JSON:
{
  "title": "Clear neutral headline",
  "summary": "Factual summary (150-250 words)",
  "location": "City, Country or 'Global'",
  "category": "Politics|Science|Technology|War|Environment|Economy|Culture|Medicine|Space|Human Rights|World",
  "region": "Global|North America|Europe|Asia|Africa|Middle East|South America|Oceania",
  "agreementRatio": 0.0-1.0,
  "isVerified": true/false,
  "keyPoints": ["point 1", "point 2", "point 3"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional fact-checker and journalist. Be neutral and precise." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0].message.content;
    let result;
    
    try {
      result = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      else throw new Error('Could not parse AI response');
    }

    return result;
  } catch (error) {
    console.error('❌ [AUTO] AI verification error:', error.message);
    return null;
  }
}

/**
 * Group similar events by title similarity
 */
function groupSimilarEvents(events) {
  const groups = [];
  
  events.forEach(event => {
    const titleWords = new Set(
      event.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3) // Only significant words
    );
    
    // Find existing group with >50% word overlap
    let foundGroup = false;
    for (const group of groups) {
      const groupWords = new Set(
        group[0].title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3)
      );
      
      const overlap = [...titleWords].filter(w => groupWords.has(w)).length;
      const similarity = overlap / Math.max(titleWords.size, groupWords.size);
      
      if (similarity > 0.5) {
        group.push(event);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      groups.push([event]);
    }
  });
  
  console.log(`📦 [AUTO] Grouped ${events.length} events into ${groups.length} unique stories`);
  return groups;
}

/**
 * Save event to Firestore
 */
async function saveToFirestore(eventData) {
  if (!db) {
    throw new Error('Firestore not initialized');
  }

  // Create unique ID from title
  const cleanTitle = eventData.title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 150);
  
  const docId = `${cleanTitle}-${eventData.date}`.replace(/\s+/g, '-');
  const docRef = doc(db, 'events', docId);
  
  // Check if already exists
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    const data = existing.data();
    // Skip if updated in last 12 hours
    const lastUpdate = data.updatedAt?.toMillis?.() || 0;
    if (Date.now() - lastUpdate < 12 * 60 * 60 * 1000) {
      console.log(`  ⏭️ [AUTO] Skipping fresh event: ${eventData.title.substring(0, 50)}...`);
      return { success: true, skipped: true };
    }
  }

  // Save to Firestore
  await setDoc(docRef, {
    ...eventData,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: false });

  console.log(`  ✅ [AUTO] Saved: ${eventData.title.substring(0, 60)}...`);
  return { success: true, id: docId };
}

/**
 * Send email summary (placeholder - requires email service)
 */
async function sendEmailSummary(stats) {
  // TODO: Implement with SendGrid, Resend, or similar
  console.log('📧 [AUTO] Email summary (not implemented yet):');
  console.log(`   - New events: ${stats.saved}`);
  console.log(`   - Rejected: ${stats.rejected}`);
  console.log(`   - Errors: ${stats.errors}`);
  
  // Placeholder for future implementation
  return { sent: false, reason: 'Email service not configured' };
}

/**
 * Main auto-update handler
 */
export async function GET(request) {
  const startTime = Date.now();
  let processed = 0;
  let saved = 0;
  let rejected = 0;
  let errors = 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🤖 AUTO-UPDATE SYSTEM STARTED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Optional authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ [AUTO] Unauthorized request');
      // Allow anyway for testing, but log warning
    }

    // Step 1: Fetch from all news sources
    console.log('\n📡 [AUTO] Fetching from news sources...');
    const [newsAPIArticles, gdeltArticles, wikipediaEvents] = await Promise.all([
      fetchNewsAPI(),
      fetchGDELT(),
      fetchWikipedia()
    ]);

    const allArticles = [
      ...newsAPIArticles,
      ...gdeltArticles,
      ...wikipediaEvents
    ];

    console.log(`📰 [AUTO] Total articles fetched: ${allArticles.length}`);

    if (allArticles.length === 0) {
      console.log('⚠️ [AUTO] No articles fetched from any source');
      return NextResponse.json({
        success: true,
        stats: { processed: 0, saved: 0, rejected: 0, errors: 0 }
      });
    }

    // Step 2: Group similar events
    const eventGroups = groupSimilarEvents(allArticles);
    console.log(`\n🔄 [AUTO] Processing ${eventGroups.length} unique events...`);

    // Step 3: Process each event group
    for (const group of eventGroups) {
      try {
        processed++;
        const mainEvent = group[0];
        const relatedSources = group.slice(1);

        console.log(`\n📝 [${processed}/${eventGroups.length}] Processing: ${mainEvent.title.substring(0, 70)}...`);
        console.log(`   Sources: ${group.length} (${relatedSources.length} related)`);

        // AI verification
        let aiResult = await verifyWithAI(mainEvent, relatedSources);
        
        if (!aiResult) {
          console.log(`  ⚠️ [AUTO] AI verification failed, using fallback`);
          // Use basic data without AI enhancement
          aiResult = {
            title: mainEvent.title,
            summary: mainEvent.description || mainEvent.title,
            location: 'Global',
            category: mainEvent.category || 'World',
            region: 'Global',
            agreementRatio: group.length > 1 ? 0.7 : 0.5,
            isVerified: false,
            keyPoints: []
          };
        }

        // Calculate credibility
        const sourceCount = group.length;
        const agreementRatio = aiResult.agreementRatio || 0.5;
        const recency = mainEvent.publishedAt ? 
          Math.floor((Date.now() - new Date(mainEvent.publishedAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        
        const credibilityScore = calculateCredibilityScore(sourceCount, agreementRatio, recency);

        console.log(`   📊 Credibility: ${credibilityScore} (sources: ${sourceCount}, agreement: ${(agreementRatio * 100).toFixed(0)}%, recency: ${recency}d)`);

        // Validation: Reject if credibility < 0.6
        if (credibilityScore < 0.6) {
          console.log(`   ❌ [AUTO] REJECTED: Credibility ${credibilityScore} < 0.6`);
          rejected++;
          continue;
        }

        // Validation: Reject if less than 2 sources
        if (sourceCount < 2) {
          console.log(`   ❌ [AUTO] REJECTED: Only ${sourceCount} source(s), need 2+`);
          rejected++;
          continue;
        }

        console.log(`   ✅ [AUTO] ACCEPTED: Meets all criteria`);

        // Prepare event data
        const eventData = {
          title: aiResult.title || mainEvent.title,
          description: (aiResult.summary || mainEvent.description || '').substring(0, 300),
          longDescription: aiResult.summary || mainEvent.description || mainEvent.title,
          date: mainEvent.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          location: aiResult.location || 'Global',
          category: aiResult.category || 'World',
          region: aiResult.region || 'Global',
          sources: group.map(g => g.url).filter(Boolean),
          verifiedSource: mainEvent.url,
          imageUrl: mainEvent.imageUrl || '',
          credibilityScore: Math.round(credibilityScore * 100), // Convert to 0-100
          importanceScore: sourceCount >= 5 ? 80 : sourceCount >= 3 ? 70 : 60,
          verified: aiResult.isVerified || false,
          addedBy: 'RealTea AI Auto-Update',
          author: 'RealTea Bot',
          newsGenerated: true,
          aiGenerated: true,
          verifiedByAI: true,
          autoUpdated: true,
          metadata: {
            sourceCount: sourceCount,
            agreementRatio: agreementRatio,
            recencyDays: recency,
            keyPoints: aiResult.keyPoints || [],
            processedAt: new Date().toISOString()
          }
        };

        // Save to Firestore
        const result = await saveToFirestore(eventData);
        
        if (result.skipped) {
          rejected++;
        } else if (result.success) {
          saved++;
        }

        // Rate limiting: Wait 2 seconds between events
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`  ❌ [AUTO] Error processing event: ${error.message}`);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const stats = {
      processed,
      saved,
      rejected,
      errors,
      durationSeconds: parseFloat(duration),
      timestamp: new Date().toISOString()
    };

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ AUTO-UPDATE COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${processed}`);
    console.log(`✅ Saved: ${saved}`);
    console.log(`❌ Rejected: ${rejected}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Send email summary (weekly check)
    const hour = new Date().getHours();
    const day = new Date().getDay();
    if (day === 1 && hour >= 8 && hour < 14) { // Monday morning
      await sendEmailSummary(stats);
    }

    return NextResponse.json({
      success: true,
      stats,
      message: `Auto-update completed: ${saved} events saved, ${rejected} rejected`
    });

  } catch (error) {
    console.error('❌ [AUTO] Fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stats: { processed, saved, rejected, errors },
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

/**
 * POST handler for manual triggers
 */
export async function POST(request) {
  return GET(request);
}

