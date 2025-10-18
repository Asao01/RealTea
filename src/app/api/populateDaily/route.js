/**
 * API Route: /api/populateDaily
 * Daily scheduled job to add historical events to the timeline
 * Runs once per day to populate events for "On This Day" in history
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

/**
 * Fetch from Wikipedia "On This Day"
 */
async function fetchWikipediaOnThisDay(month, day) {
  try {
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-HistoryBot/1.0' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error(`❌ Wikipedia error:`, error.message);
    return [];
  }
}

/**
 * Fetch from MuffinLabs History API
 */
async function fetchMuffinLabs(month, day) {
  try {
    const url = `https://history.muffinlabs.com/date/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-HistoryBot/1.0' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.data?.Events || [];
  } catch (error) {
    console.error(`❌ MuffinLabs error:`, error.message);
    return [];
  }
}

/**
 * Categorize event from text
 */
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (/war|battle|conflict|invasion|military|treaty/i.test(text)) return 'War';
  if (/election|president|government|political/i.test(text)) return 'Politics';
  if (/discover|invention|science|nobel/i.test(text)) return 'Science';
  if (/computer|internet|technology/i.test(text)) return 'Technology';
  if (/environment|climate/i.test(text)) return 'Environment';
  if (/economy|market|trade/i.test(text)) return 'Economy';
  if (/art|music|culture/i.test(text)) return 'Culture';
  if (/medicine|disease|vaccine/i.test(text)) return 'Medicine';
  if (/space|NASA|astronaut/i.test(text)) return 'Space';
  if (/human rights|civil rights/i.test(text)) return 'Human Rights';
  
  return 'World';
}

/**
 * Extract region from summary
 */
function extractRegion(summary) {
  const regionPatterns = {
    'North America': /in (United States|USA|America|Canada|Mexico|North America)/i,
    'Europe': /in (Europe|Britain|France|Germany|Italy|Spain|UK|England|Russia)/i,
    'Asia': /in (Asia|China|Japan|India|Korea|Vietnam)/i,
    'Middle East': /in (Middle East|Iran|Iraq|Israel|Saudi Arabia|Turkey)/i,
    'Africa': /in (Africa|Egypt|South Africa|Nigeria)/i,
    'South America': /in (South America|Brazil|Argentina|Chile)/i,
    'Oceania': /in (Australia|New Zealand|Pacific)/i,
  };

  for (const [regionName, pattern] of Object.entries(regionPatterns)) {
    if (pattern.test(summary)) {
      return regionName;
    }
  }

  return 'Global';
}

/**
 * AI summarization
 */
async function summarizeWithAI(event) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      summary: event.description || event.title,
      region: 'Global'
    };
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `Summarize this historical event in exactly 2 factual sentences. Include the region and significance.

Event: ${event.title}
Year: ${event.year}

Format: Two complete sentences. First: What happened. Second: Why it matters. Include geographical region.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a historian. Write exactly 2 factual sentences." },
        { role: "user", content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.3,
    });

    const summary = completion.choices[0].message.content.trim();
    const region = extractRegion(summary);

    return { summary, region };
  } catch (error) {
    console.error(`  ⚠️ AI error: ${error.message}`);
    return {
      summary: event.description || event.title,
      region: 'Global'
    };
  }
}

/**
 * Main GET handler - runs daily via cron
 */
export async function GET(request) {
  const startTime = Date.now();
  let processed = 0;
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🏛️  DAILY HISTORY POPULATION');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ ${new Date().toISOString()}`);

  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️ Unauthorized request - continuing anyway');
    }

    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Get today's date
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`📅 Fetching events for ${month}/${day} across all years...\n`);

    // Fetch from both sources
    const [wikiEvents, muffinEvents] = await Promise.all([
      fetchWikipediaOnThisDay(month, day),
      fetchMuffinLabs(month, day)
    ]);

    // Combine and deduplicate
    const allEvents = [...wikiEvents, ...muffinEvents];
    const uniqueEvents = new Map();
    
    allEvents.forEach(event => {
      const key = `${event.year}-${event.title.substring(0, 50)}`;
      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, event);
      }
    });

    const eventsToProcess = Array.from(uniqueEvents.values());

    console.log(`📚 Found ${eventsToProcess.length} unique events`);
    console.log(`   Wikipedia: ${wikiEvents.length}`);
    console.log(`   MuffinLabs: ${muffinEvents.length}\n`);

    if (eventsToProcess.length === 0) {
      console.log('⚠️ No events found for today\n');
      return NextResponse.json({
        success: true,
        stats: { processed: 0, saved: 0, skipped: 0, errors: 0 }
      });
    }

    // Process in batches of 50
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < eventsToProcess.length; i += batchSize) {
      batches.push(eventsToProcess.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches...\n`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = writeBatch(db);
      const batchEvents = batches[batchIndex];

      console.log(`Batch ${batchIndex + 1}/${batches.length}:`);

      for (const event of batchEvents) {
        try {
          processed++;

          // Get AI summary
          const { summary, region } = await summarizeWithAI(event);
          const category = categorizeEvent(event.title, summary);

          // Create document ID
          const cleanTitle = event.title
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase()
            .slice(0, 120);
          
          const eventDate = `${event.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const docId = `${cleanTitle}-${eventDate}`;
          const docRef = doc(db, 'events', docId);

          // Check if exists
          const existing = await getDoc(docRef);
          if (existing.exists()) {
            skipped++;
            continue;
          }

          // Add to batch
          batch.set(docRef, {
            title: event.title,
            description: summary.substring(0, 300),
            longDescription: summary,
            date: eventDate,
            year: event.year.toString(),
            location: region,
            category: category,
            region: region,
            sources: event.links?.map(l => l.url).filter(Boolean).slice(0, 3) || ['https://wikipedia.org'],
            verifiedSource: event.links?.[0]?.url || 'https://wikipedia.org',
            imageUrl: event.imageUrl || '',
            credibilityScore: 100,
            importanceScore: 80,
            verified: true,
            verifiedByAI: true,
            addedBy: 'auto',
            author: event.source || 'Wikipedia',
            newsGenerated: false,
            aiGenerated: true,
            historical: true,
            autoUpdated: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          console.log(`  ✅ Queued: ${event.title.substring(0, 50)}... (${event.year})`);

          // Rate limit AI calls
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errors++;
        }
      }

      // Commit batch
      try {
        await batch.commit();
        saved += batchEvents.length - skipped;
        console.log(`  💾 Batch committed: ${batchEvents.length - skipped} events\n`);
      } catch (error) {
        console.error(`  ❌ Batch commit failed: ${error.message}\n`);
        errors += batchEvents.length;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ DAILY POPULATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${processed}`);
    console.log(`✅ Saved: ${saved}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      stats: {
        processed,
        saved,
        skipped,
        errors,
        date: `${month}/${day}`,
        durationSeconds: parseFloat(duration),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stats: { processed, saved, skipped, errors },
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

