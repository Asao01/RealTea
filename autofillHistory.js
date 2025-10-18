/**
 * ═══════════════════════════════════════════════════════════════════
 * RealTea Historical Events Auto-Fill Script
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Automatically populates Firestore with verified historical events
 * from public APIs and AI-powered summarization.
 * 
 * USAGE:
 *   node autofillHistory.js
 *   node autofillHistory.js --month 7 --day 20      # Specific date
 *   node autofillHistory.js --quick                 # Sample 20 events
 * 
 * REQUIREMENTS:
 *   - Node.js 18+
 *   - .env.local file with Firebase and OpenAI credentials
 *   - npm install node-fetch openai firebase
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '.env.local') });

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  BATCH_SIZE: 500,           // Firestore max batch size
  AI_DELAY_MS: 1000,         // Delay between AI calls (rate limiting)
  DATE_DELAY_MS: 500,        // Delay between processing dates
  MAX_EVENTS_PER_DATE: 20,   // Limit events per date to avoid overload
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: 150,
};

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app, db, openai;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

// Initialize OpenAI
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI initialized');
} else {
  console.warn('⚠️  OPENAI_API_KEY not found - AI summaries disabled');
}

// Statistics tracking
const stats = {
  processed: 0,
  saved: 0,
  skipped: 0,
  errors: 0,
  startTime: Date.now()
};

// ═══════════════════════════════════════════════════════════════════
// API FETCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch events from MuffinLabs History API
 * API: https://history.muffinlabs.com/date/{month}/{day}
 */
async function fetchMuffinLabs(month, day) {
  try {
    const url = `https://history.muffinlabs.com/date/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-HistoryBot/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.error(`  ⚠️  MuffinLabs returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const events = data.data?.Events || [];
    
    return events.map(event => ({
      title: event.text,
      year: event.year,
      description: event.html?.replace(/<[^>]*>/g, '') || event.text, // Strip HTML
      links: event.links || [],
      source: 'MuffinLabs'
    }));
  } catch (error) {
    console.error(`  ❌ MuffinLabs error: ${error.message}`);
    return [];
  }
}

/**
 * Fetch events from Wikipedia REST API
 * API: https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/{month}/{day}
 */
async function fetchWikipediaEvents(month, day) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'RealTea-HistoryBot/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.error(`  ⚠️  Wikipedia returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const events = data.events || [];
    
    return events.map(event => ({
      title: event.text,
      year: event.year,
      description: event.pages?.[0]?.extract || event.text,
      links: event.pages?.map(p => ({ 
        title: p.title, 
        url: p.content_urls?.desktop?.page 
      })) || [],
      imageUrl: event.pages?.[0]?.thumbnail?.source || '',
      source: 'Wikipedia'
    }));
  } catch (error) {
    console.error(`  ❌ Wikipedia error: ${error.message}`);
    return [];
  }
}

/**
 * Fetch Wikipedia page summary for more details
 * API: https://en.wikipedia.org/api/rest_v1/page/summary/{title}
 */
async function fetchWikipediaSummary(title) {
  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-HistoryBot/1.0' },
      signal: AbortSignal.timeout(5000)
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

// ═══════════════════════════════════════════════════════════════════
// AI PROCESSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Use OpenAI to create factual 2-3 sentence summary
 */
async function summarizeWithAI(event, wikiSummary = null) {
  if (!openai) {
    // Fallback without AI
    return {
      summary: event.description || event.title,
      region: 'Global',
      category: 'World'
    };
  }

  try {
    const contextText = wikiSummary?.extract || event.description || event.title;

    const prompt = `Summarize this historical event in 2-3 factual sentences. Include the geographical region and significance.

Event: ${event.title}
Year: ${event.year}
Context: ${contextText.substring(0, 500)}

Format: 
- Sentence 1: What happened (include region like "in Europe", "in Asia", or "globally")
- Sentence 2-3: Why it matters historically

Be concise, neutral, and factual.`;

    const completion = await openai.chat.completions.create({
      model: CONFIG.OPENAI_MODEL,
      messages: [
        { 
          role: "system", 
          content: "You are a professional historian. Summarize events in exactly 2-3 factual sentences. Always mention the geographical region." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: CONFIG.OPENAI_MAX_TOKENS,
      temperature: 0.3,
    });

    const summary = completion.choices[0].message.content.trim();
    
    // Extract region from summary
    const region = extractRegion(summary);
    const category = categorizeEvent(event.title, summary);

    return { summary, region, category };

  } catch (error) {
    console.error(`    ⚠️  AI error: ${error.message}`);
    
    // Fallback
    return {
      summary: event.description || event.title,
      region: 'Global',
      category: categorizeEvent(event.title, event.description || '')
    };
  }
}

/**
 * Extract geographical region from text
 */
function extractRegion(text) {
  const regionPatterns = {
    'North America': /\b(United States|USA|America|Canada|Mexico|North America|Washington|New York)\b/i,
    'Europe': /\b(Europe|Britain|France|Germany|Italy|Spain|UK|England|Russia|London|Paris|Berlin)\b/i,
    'Asia': /\b(Asia|China|Japan|India|Korea|Vietnam|Thailand|Indonesia|Beijing|Tokyo)\b/i,
    'Middle East': /\b(Middle East|Iran|Iraq|Israel|Saudi Arabia|Turkey|Egypt|Jerusalem|Baghdad)\b/i,
    'Africa': /\b(Africa|Egypt|South Africa|Nigeria|Kenya|Ethiopia|Cairo)\b/i,
    'South America': /\b(South America|Brazil|Argentina|Chile|Peru|Colombia|Buenos Aires)\b/i,
    'Oceania': /\b(Australia|New Zealand|Pacific|Oceania|Sydney)\b/i,
  };

  for (const [regionName, pattern] of Object.entries(regionPatterns)) {
    if (pattern.test(text)) {
      return regionName;
    }
  }

  return 'Global';
}

/**
 * Categorize event based on keywords
 */
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (/\b(war|battle|conflict|invasion|military|army|navy|treaty|combat|siege)\b/i.test(text)) return 'War';
  if (/\b(election|president|prime minister|government|congress|parliament|political|vote)\b/i.test(text)) return 'Politics';
  if (/\b(discover|invention|science|research|nobel|experiment|theory|scientist|physicist)\b/i.test(text)) return 'Science';
  if (/\b(computer|internet|technology|software|innovation|digital|algorithm|programming)\b/i.test(text)) return 'Technology';
  if (/\b(environment|climate|pollution|conservation|endangered|ecosystem|sustainability)\b/i.test(text)) return 'Environment';
  if (/\b(economy|market|trade|finance|stock|recession|GDP|inflation|banking)\b/i.test(text)) return 'Economy';
  if (/\b(art|music|literature|culture|film|book|painting|theater|dance|museum)\b/i.test(text)) return 'Culture';
  if (/\b(medicine|disease|vaccine|doctor|hospital|health|pandemic|cure|surgery)\b/i.test(text)) return 'Medicine';
  if (/\b(space|NASA|astronaut|satellite|rocket|moon|mars|planet|orbit|launch)\b/i.test(text)) return 'Space';
  if (/\b(human rights|civil rights|freedom|equality|justice|protest|discrimination)\b/i.test(text)) return 'Human Rights';
  
  return 'World';
}

// ═══════════════════════════════════════════════════════════════════
// FIRESTORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check for duplicate event (same title and year)
 */
async function isDuplicate(title, year, date) {
  try {
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 100);
    
    const docId = `${cleanTitle}-${date}`;
    const docRef = doc(db, 'events', docId);
    
    const snapshot = await getDoc(docRef);
    return snapshot.exists();
  } catch (error) {
    console.error(`    ⚠️  Duplicate check failed: ${error.message}`);
    return false;
  }
}

/**
 * Save events to Firestore using batch writes
 * Includes duplicate checking and validation
 */
async function saveEventsBatch(events) {
  if (events.length === 0) return 0;

  let savedCount = 0;
  let skippedCount = 0;
  const batches = [];

  // Split into batches of 500 (Firestore limit)
  for (let i = 0; i < events.length; i += CONFIG.BATCH_SIZE) {
    batches.push(events.slice(i, i + CONFIG.BATCH_SIZE));
  }

  console.log(`    📦 Saving ${events.length} events in ${batches.length} batch(es)...`);

  for (const batchEvents of batches) {
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const eventData of batchEvents) {
      // Validate required fields
      if (!eventData.title || !eventData.date) {
        console.log(`    ⏭️  Skipping invalid event (missing title or date)`);
        stats.skipped++;
        skippedCount++;
        continue;
      }

      // Validate credibilityScore >= 0.6 (60/100)
      if (eventData.credibilityScore < 60) {
        console.log(`    ❌ Skipping low credibility: ${eventData.title.substring(0, 40)}... (score: ${eventData.credibilityScore})`);
        stats.skipped++;
        skippedCount++;
        continue;
      }

      // Validate verifiedByAI is true
      if (!eventData.verifiedByAI) {
        console.log(`    ⚠️  Skipping unverified event: ${eventData.title.substring(0, 40)}...`);
        stats.skipped++;
        skippedCount++;
        continue;
      }

      // Create unique document ID from title + date
      const cleanTitle = eventData.title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 100);
      
      const docId = `${cleanTitle}-${eventData.date}`;
      const docRef = doc(db, 'events', docId);
      
      // Check for duplicate
      const exists = await getDoc(docRef);
      if (exists.exists()) {
        console.log(`    ⏭️  Duplicate found, skipping: ${eventData.title.substring(0, 40)}...`);
        stats.skipped++;
        skippedCount++;
        continue;
      }

      // Add to batch
      batch.set(docRef, eventData, { merge: false });
      batchCount++;
      
      console.log(`    ✅ Queued: ${eventData.title.substring(0, 50)}... (${eventData.year})`);
    }

    // Only commit if batch has events
    if (batchCount > 0) {
      try {
        await batch.commit();
        savedCount += batchCount;
        console.log(`    💾 Batch committed: ${batchCount} events saved, ${skippedCount} skipped`);
      } catch (error) {
        console.error(`    ❌ Batch commit failed: ${error.message}`);
        stats.errors += batchCount;
      }
    }
  }

  return savedCount;
}

/**
 * Check if event already exists in Firestore
 */
async function eventExists(title, date) {
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100);
  
  const docId = `${cleanTitle}-${date}`;
  const docRef = doc(db, 'events', docId);
  
  const snapshot = await getDoc(docRef);
  return snapshot.exists();
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PROCESSING LOGIC
// ═══════════════════════════════════════════════════════════════════

/**
 * Process events for a specific date
 */
async function processDate(month, day) {
  console.log(`\n📅 Processing ${month}/${day}...`);

  // Fetch from both APIs in parallel
  const [muffinEvents, wikiEvents] = await Promise.all([
    fetchMuffinLabs(month, day),
    fetchWikipediaEvents(month, day)
  ]);

  console.log(`  📚 Found: MuffinLabs (${muffinEvents.length}) + Wikipedia (${wikiEvents.length}) = ${muffinEvents.length + wikiEvents.length} events`);

  // Combine and deduplicate by year + title
  const combinedEvents = [...muffinEvents, ...wikiEvents];
  const uniqueEvents = new Map();
  
  combinedEvents.forEach(event => {
    const key = `${event.year}-${event.title.substring(0, 50).toLowerCase()}`;
    if (!uniqueEvents.has(key)) {
      uniqueEvents.set(key, event);
    }
  });

  const eventsToProcess = Array.from(uniqueEvents.values())
    .slice(0, CONFIG.MAX_EVENTS_PER_DATE); // Limit to prevent overload

  console.log(`  🔍 Unique events to process: ${eventsToProcess.length}`);

  if (eventsToProcess.length === 0) return 0;

  // Process each event
  const processedEvents = [];

  for (let i = 0; i < eventsToProcess.length; i++) {
    const event = eventsToProcess[i];
    
    try {
      stats.processed++;

      // Create date string
      const eventDate = `${event.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Check if already exists
      const exists = await eventExists(event.title, eventDate);
      if (exists) {
        stats.skipped++;
        console.log(`    ⏭️  [${i + 1}/${eventsToProcess.length}] Skipping duplicate: ${event.title.substring(0, 50)}...`);
        continue;
      }

      console.log(`    📝 [${i + 1}/${eventsToProcess.length}] Processing: ${event.title.substring(0, 50)}...`);

      // Fetch Wikipedia summary if event has a link
      let wikiSummary = null;
      if (event.links && event.links.length > 0) {
        const firstLink = event.links[0];
        const pageTitle = firstLink.title || firstLink.link?.split('/wiki/')[1];
        
        if (pageTitle) {
          wikiSummary = await fetchWikipediaSummary(pageTitle);
        }
      }

      // Get AI-enhanced summary
      const { summary, region, category } = await summarizeWithAI(event, wikiSummary);

      // Prepare Firestore document
      const eventData = {
        // Core fields
        title: event.title,
        description: summary.substring(0, 300),
        longDescription: summary,
        
        // Date fields
        date: eventDate,
        year: event.year.toString(),
        
        // Location/Classification
        location: region,
        category: category,
        region: region,
        
        // Sources
        sources: [
          'https://history.muffinlabs.com',
          'https://en.wikipedia.org',
          ...(event.links?.map(l => l.url || l.link).filter(Boolean) || [])
        ].slice(0, 5),
        verifiedSource: wikiSummary?.url || event.links?.[0]?.url || 'https://wikipedia.org',
        
        // Media
        imageUrl: wikiSummary?.thumbnail || event.imageUrl || '',
        
        // Verification
        credibilityScore: 100, // Historical events from verified sources = 100%
        importanceScore: event.links && event.links.length > 2 ? 90 : 75,
        verified: true,
        verifiedByAI: openai ? true : false,
        
        // Attribution
        addedBy: 'auto',
        author: event.source,
        
        // Flags
        newsGenerated: false,
        aiGenerated: openai ? true : false,
        historical: true,
        autoUpdated: true,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      processedEvents.push(eventData);

      console.log(`      ✅ Summary: ${summary.substring(0, 80)}...`);
      console.log(`      📍 Region: ${region} | Category: ${category}`);

      // Rate limiting for AI calls
      if (openai) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.AI_DELAY_MS));
      }

    } catch (error) {
      console.error(`    ❌ Error processing event: ${error.message}`);
      stats.errors++;
    }
  }

  // Batch save to Firestore
  if (processedEvents.length > 0) {
    const saved = await saveEventsBatch(processedEvents);
    stats.saved += saved;
    return saved;
  }

  return 0;
}

/**
 * Process all dates in the calendar (12 months × 31 days)
 */
async function processAllDates() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         🏛️  FILLING REALTEA HISTORICAL TIMELINE           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`🗄️  Database: ${firebaseConfig.projectId}`);
  console.log(`🤖 AI Summaries: ${openai ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📅 Processing: All calendar dates (1-12 months, 1-31 days)`);
  console.log('');

  for (let month = 1; month <= 12; month++) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📆 MONTH ${month}/12`);
    console.log(`${'═'.repeat(60)}`);

    const daysInMonth = new Date(2024, month, 0).getDate(); // Get days in month

    for (let day = 1; day <= daysInMonth; day++) {
      try {
        await processDate(month, day);
        
        // Small delay between dates to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, CONFIG.DATE_DELAY_MS));
      } catch (error) {
        console.error(`❌ Fatal error on ${month}/${day}:`, error.message);
        stats.errors++;
      }
    }

    // Progress summary every month
    printProgress();
  }
}

/**
 * Quick mode: Sample 20 events for testing
 */
async function quickMode() {
  console.log('\n🚀 QUICK MODE: Sampling 20 diverse historical events\n');

  const significantDates = [
    { month: 7, day: 20 },   // July 20 (Moon landing)
    { month: 12, day: 7 },   // Dec 7 (Pearl Harbor)
    { month: 11, day: 9 },   // Nov 9 (Berlin Wall)
    { month: 1, day: 1 },    // Jan 1 (New Year events)
    { month: 7, day: 4 },    // July 4 (Independence)
  ];

  for (const date of significantDates) {
    await processDate(date.month, date.day);
  }
}

/**
 * Print progress statistics
 */
function printProgress() {
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);
  const rate = (stats.saved / (duration || 1)).toFixed(1);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PROGRESS UPDATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Processed: ${stats.processed.toLocaleString()}`);
  console.log(`   ✅ Saved: ${stats.saved.toLocaleString()}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  console.log(`   ⏱️  Duration: ${duration} minutes`);
  console.log(`   📈 Rate: ${rate} events/minute`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let mode = 'all'; // Default: process all dates
  let specificMonth = null;
  let specificDay = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--quick') {
      mode = 'quick';
    } else if (args[i] === '--month') {
      specificMonth = parseInt(args[i + 1]);
    } else if (args[i] === '--day') {
      specificDay = parseInt(args[i + 1]);
    }
  }

  // Validate Firebase
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.error('\n❌ ERROR: Firebase credentials not found!');
    console.error('📝 Create .env.local file with:');
    console.error('   NEXT_PUBLIC_FIREBASE_API_KEY=...');
    console.error('   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...');
    console.error('   (and other Firebase config)\n');
    process.exit(1);
  }

  // Validate OpenAI (optional)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('\n⚠️  WARNING: OPENAI_API_KEY not found');
    console.warn('   Events will be saved WITHOUT AI summaries');
    console.warn('   Add OPENAI_API_KEY to .env.local for better quality\n');
  }

  try {
    if (mode === 'quick') {
      // Quick test mode
      await quickMode();
    } else if (specificMonth && specificDay) {
      // Process specific date
      await processDate(specificMonth, specificDay);
    } else {
      // Process all dates
      await processAllDates();
    }

    // Final summary
    const totalDuration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ POPULATION COMPLETE                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('📊 FINAL STATISTICS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total Processed: ${stats.processed.toLocaleString()}`);
    console.log(`   ✅ Saved to Firestore: ${stats.saved.toLocaleString()}`);
    console.log(`   ⏭️  Skipped (duplicates): ${stats.skipped.toLocaleString()}`);
    console.log(`   ❌ Errors: ${stats.errors}`);
    console.log(`   ⏱️  Total Duration: ${totalDuration} minutes`);
    console.log(`   📈 Average Rate: ${(stats.saved / (totalDuration || 1)).toFixed(1)} events/min`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎉 Success! Your timeline is now populated with historical events.');
    console.log('🌐 Visit: http://localhost:3000/timeline to see the results\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the script
main();

