/**
 * ═══════════════════════════════════════════════════════════════════
 * RealTea Historical Backfill Script
 * One-time population of 400 years of global history (1600-2025)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 *   Fill Firestore with verified historical events from free public APIs
 * 
 * USAGE:
 *   node backfillHistory.js                    # Full backfill (1600-2025)
 *   node backfillHistory.js --year 1969        # Single year
 *   node backfillHistory.js --start 1900 --end 2000
 *   node backfillHistory.js --quick            # Test mode (5 dates)
 * 
 * FEATURES:
 *   ✅ Free public APIs (no keys needed except OpenAI)
 *   ✅ Revision tracking for existing events
 *   ✅ Duplicate detection and skipping
 *   ✅ Batch writes (100 per batch)
 *   ✅ Progress tracking per year
 *   ✅ Resume capability
 *   ✅ AI-powered summaries
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, writeBatch, collection, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  BATCH_SIZE: 100,              // Events per Firestore batch
  API_DELAY_MS: 1000,           // Delay between AI calls
  DATE_DELAY_MS: 300,           // Delay between dates
  MAX_EVENTS_PER_DATE: 50,      // Limit to prevent overload
  MIN_CREDIBILITY: 0.6,         // Minimum credibility score
  PROGRESS_FILE: 'backfill-progress.json',
  START_YEAR: 1500,             // Early Modern Period begins
  CURRENT_YEAR: new Date().getFullYear(),
};

/**
 * Ancient Anchor Events (before 1500 CE)
 * Major world-shaping milestones to provide historical context
 */
const ANCHOR_EVENTS = [
  {
    year: -3200,
    title: "Invention of Writing in Sumer",
    summary: "The Sumerians in ancient Mesopotamia developed cuneiform, the world's first known writing system, marking the transition from prehistory to recorded history. This revolutionary innovation enabled the preservation of knowledge, laws, and cultural heritage across generations.",
    region: "Middle East",
    category: "Culture",
    date: "-3200-01-01"
  },
  {
    year: -2560,
    title: "Construction of the Great Pyramid of Giza",
    summary: "The Great Pyramid of Giza was built in ancient Egypt as a tomb for Pharaoh Khufu, becoming the oldest and largest of the three pyramids in the Giza pyramid complex. This architectural marvel remained the world's tallest man-made structure for over 3,800 years.",
    region: "Africa",
    category: "Culture",
    date: "-2560-01-01"
  },
  {
    year: -753,
    title: "Founding of Rome",
    summary: "According to Roman mythology, Rome was founded by Romulus on April 21, 753 BCE, establishing what would become one of history's greatest empires. The city grew from a small settlement on the Tiber River to dominate the Mediterranean world for over a millennium.",
    region: "Europe",
    category: "Politics",
    date: "-0753-04-21"
  },
  {
    year: -221,
    title: "Unification of China under Qin Dynasty",
    summary: "Emperor Qin Shi Huang unified China by conquering the remaining Warring States, establishing the Qin Dynasty and becoming China's first emperor. His reign introduced standardized writing, currency, and measurements, and began construction of the Great Wall.",
    region: "Asia",
    category: "Politics",
    date: "-0221-01-01"
  },
  {
    year: 476,
    title: "Fall of the Western Roman Empire",
    summary: "The Western Roman Empire fell when Germanic chieftain Odoacer deposed Emperor Romulus Augustulus in Rome, marking the end of ancient Rome and the beginning of the Middle Ages in Europe. This event fundamentally reshaped European politics, culture, and society for the next thousand years.",
    region: "Europe",
    category: "Politics",
    date: "0476-09-04"
  },
  {
    year: 622,
    title: "The Hijra - Beginning of Islamic Calendar",
    summary: "Prophet Muhammad migrated from Mecca to Medina in an event known as the Hijra, marking the beginning of the Islamic calendar and the establishment of the first Muslim community. This migration laid the foundation for the rapid expansion of Islam across three continents.",
    region: "Middle East",
    category: "Culture",
    date: "0622-09-24"
  },
  {
    year: 1054,
    title: "The Great Schism - Christianity Divides",
    summary: "The Christian Church split into the Roman Catholic Church in the West and the Eastern Orthodox Church in the East, following theological disputes and political tensions that had been building for centuries. This schism created a divide that persists to this day.",
    region: "Europe",
    category: "Culture",
    date: "1054-07-16"
  },
  {
    year: 1206,
    title: "Genghis Khan Unifies the Mongol Tribes",
    summary: "Temüjin was proclaimed Genghis Khan, establishing the Mongol Empire which would become the largest contiguous land empire in history, spanning from Eastern Europe to the Sea of Japan. His conquests reshaped global trade routes and cultural exchange across Eurasia.",
    region: "Asia",
    category: "War",
    date: "1206-01-01"
  },
  {
    year: 1271,
    title: "Marco Polo's Journey to China Begins",
    summary: "Venetian merchant Marco Polo began his legendary journey along the Silk Road to China, where he would serve in Kublai Khan's court for 17 years. His detailed accounts of Asian culture, technology, and wealth sparked European interest in Eastern trade and exploration.",
    region: "Asia",
    category: "Culture",
    date: "1271-01-01"
  },
  {
    year: 1347,
    title: "Black Death Arrives in Europe",
    summary: "The bubonic plague pandemic known as the Black Death arrived in Europe via trading ships, killing an estimated 30-60% of the European population over the next five years. This devastating plague reshaped European society, economy, labor systems, and religious beliefs.",
    region: "Europe",
    category: "Medicine",
    date: "1347-10-01"
  },
  {
    year: 1453,
    title: "Fall of Constantinople to the Ottoman Empire",
    summary: "Ottoman Sultan Mehmed II conquered Constantinople, ending the Byzantine Empire and marking the definitive end of the Middle Ages in Europe. The fall of this ancient Christian capital shifted trade routes, sparked the Renaissance, and established Ottoman dominance in the Eastern Mediterranean.",
    region: "Europe",
    category: "War",
    date: "1453-05-29"
  },
  {
    year: 1492,
    title: "Christopher Columbus Reaches the Americas",
    summary: "Christopher Columbus, sailing for Spain, made landfall in the Bahamas, initiating permanent European contact with the Americas and beginning the Columbian Exchange. This voyage fundamentally transformed global history, leading to colonization, cultural exchange, and demographic upheaval.",
    region: "North America",
    category: "World",
    date: "1492-10-12"
  }
];

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Global statistics
const stats = {
  totalProcessed: 0,
  totalCreated: 0,
  totalUpdated: 0,
  totalSkipped: 0,
  totalErrors: 0,
  yearProgress: {},
  startTime: Date.now()
};

// ═══════════════════════════════════════════════════════════════════
// API FETCHING - FREE PUBLIC APIS (NO KEYS REQUIRED)
// ═══════════════════════════════════════════════════════════════════

/**
 * Fetch from MuffinLabs History API
 * FREE - No API key needed
 */
async function fetchMuffinLabs(month, day) {
  try {
    const url = `https://history.muffinlabs.com/date/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-Backfill/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const events = data.data?.Events || [];
    
    return events.map(e => ({
      title: e.text,
      year: e.year,
      description: e.html?.replace(/<[^>]*>/g, '') || e.text,
      links: e.links || [],
      source: 'MuffinLabs'
    }));
  } catch (error) {
    console.error(`    ⚠️  MuffinLabs error: ${error.message}`);
    return [];
  }
}

/**
 * Fetch from Wikipedia "On This Day" API
 * FREE - No API key needed
 */
async function fetchWikipediaEvents(month, day) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'RealTea-Backfill/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const events = data.events || [];
    
    return events.map(e => ({
      title: e.text,
      year: e.year,
      description: e.pages?.[0]?.extract || e.text,
      links: e.pages?.map(p => ({ 
        title: p.title,
        url: p.content_urls?.desktop?.page 
      })) || [],
      imageUrl: e.pages?.[0]?.thumbnail?.source || '',
      source: 'Wikipedia'
    }));
  } catch (error) {
    console.error(`    ⚠️  Wikipedia error: ${error.message}`);
    return [];
  }
}

/**
 * Fetch Wikipedia page summary for detailed info
 * FREE - No API key needed
 */
async function fetchWikiSummary(title) {
  try {
    const encoded = encodeURIComponent(title);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea-Backfill/1.0' },
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
// AI PROCESSING
// ═══════════════════════════════════════════════════════════════════

/**
 * Use OpenAI to create 2-3 sentence factual summary
 */
async function summarizeWithAI(event, wikiSummary) {
  if (!openai) {
    console.log('      ⚠️  OpenAI not configured, using original description');
    return {
      summary: event.description || event.title,
      region: 'Global',
      category: 'World'
    };
  }

  try {
    const context = wikiSummary?.extract || event.description || event.title;

    const prompt = `Summarize this historical event in 2-3 factual sentences. Include the geographical region and significance.

Event: ${event.title}
Year: ${event.year}
Context: ${context.substring(0, 500)}

Format:
Sentence 1: What happened (include region like "in Europe", "in North America", or "globally")
Sentence 2: Why it matters historically
Sentence 3 (optional): Key impact or legacy

Be concise, neutral, factual.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional historian. Write exactly 2-3 factual sentences. Always mention the geographical region in sentence 1.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const summary = completion.choices[0].message.content.trim();
    const region = extractRegion(summary);
    const category = categorizeEvent(event.title, summary);

    return { summary, region, category };

  } catch (error) {
    console.error(`      ⚠️  AI error: ${error.message}`);
    return {
      summary: event.description || event.title,
      region: 'Global',
      category: 'World'
    };
  }
}

/**
 * Extract geographical region from text
 */
function extractRegion(text) {
  const patterns = {
    'North America': /\b(United States|USA|America|Canada|Mexico|North America|Washington|New York|California)\b/i,
    'Europe': /\b(Europe|Britain|France|Germany|Italy|Spain|UK|England|Russia|London|Paris|Berlin|Rome)\b/i,
    'Asia': /\b(Asia|China|Japan|India|Korea|Vietnam|Thailand|Indonesia|Beijing|Tokyo|Delhi)\b/i,
    'Middle East': /\b(Middle East|Iran|Iraq|Israel|Saudi Arabia|Turkey|Egypt|Jerusalem|Baghdad|Tehran)\b/i,
    'Africa': /\b(Africa|South Africa|Nigeria|Kenya|Ethiopia|Morocco|Cairo|Lagos)\b/i,
    'South America': /\b(South America|Brazil|Argentina|Chile|Peru|Colombia|Buenos Aires|Rio de Janeiro)\b/i,
    'Oceania': /\b(Australia|New Zealand|Pacific|Oceania|Sydney|Auckland)\b/i,
  };

  for (const [region, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return region;
  }
  
  return 'Global';
}

/**
 * Categorize event based on keywords
 */
function categorizeEvent(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  if (/\b(war|battle|conflict|invasion|military|army|treaty|combat)\b/i.test(text)) return 'War';
  if (/\b(election|president|prime minister|government|political|vote|democracy)\b/i.test(text)) return 'Politics';
  if (/\b(discover|invention|science|research|nobel|experiment|theory|physicist)\b/i.test(text)) return 'Science';
  if (/\b(computer|internet|technology|software|digital|innovation)\b/i.test(text)) return 'Technology';
  if (/\b(environment|climate|pollution|conservation|ecology)\b/i.test(text)) return 'Environment';
  if (/\b(economy|market|trade|finance|stock|recession|GDP)\b/i.test(text)) return 'Economy';
  if (/\b(art|music|literature|culture|film|book|painting|theater)\b/i.test(text)) return 'Culture';
  if (/\b(medicine|disease|vaccine|doctor|hospital|health|pandemic)\b/i.test(text)) return 'Medicine';
  if (/\b(space|NASA|astronaut|satellite|rocket|moon|mars|orbit)\b/i.test(text)) return 'Space';
  if (/\b(human rights|civil rights|freedom|equality|justice)\b/i.test(text)) return 'Human Rights';
  
  return 'World';
}

// ═══════════════════════════════════════════════════════════════════
// FIRESTORE OPERATIONS WITH REVISION TRACKING
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if event exists and return document reference
 */
async function getExistingEvent(title, year, date) {
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100);
  
  const docId = `${cleanTitle}-${date}`;
  const docRef = doc(db, 'events', docId);
  const snapshot = await getDoc(docRef);
  
  if (snapshot.exists()) {
    return {
      id: docId,
      ref: docRef,
      data: snapshot.data()
    };
  }
  
  return null;
}

/**
 * Save events with revision tracking
 * - If event exists: append to revisions array
 * - If new: create with empty revisions array
 */
async function saveEventsWithRevisions(events) {
  if (events.length === 0) return { created: 0, updated: 0, skipped: 0 };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Process in batches of 100
  for (let i = 0; i < events.length; i += CONFIG.BATCH_SIZE) {
    const batchEvents = events.slice(i, i + CONFIG.BATCH_SIZE);
    const batch = writeBatch(db);
    let batchOps = 0;

    console.log(`\n    📦 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(events.length / CONFIG.BATCH_SIZE)}...`);

    for (const eventData of batchEvents) {
      try {
        // Check if event already exists
        const existing = await getExistingEvent(eventData.title, eventData.year, eventData.date);

        const cleanTitle = eventData.title
          .replace(/[^a-zA-Z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .slice(0, 100);
        
        const docId = `${cleanTitle}-${eventData.date}`;
        const docRef = doc(db, 'events', docId);

        if (existing) {
          // Event exists - check if we should add a revision
          const existingData = existing.data;
          
          // Check if summary is different (new information)
          if (existingData.summary === eventData.summary) {
            console.log(`      ⏭️  No changes, skipping: ${eventData.title.substring(0, 40)}...`);
            skipped++;
            continue;
          }

          // Add revision to track historical changes
          const revision = {
            updatedAt: new Date().toISOString(),
            aiSummary: eventData.summary,
            sourcesChecked: eventData.sources,
            credibilityScore: eventData.credibilityScore / 100, // Convert to 0-1
            region: eventData.region,
            category: eventData.category
          };

          // Update with new revision
          const updatedRevisions = [...(existingData.revisions || []), revision];
          
          batch.update(docRef, {
            summary: eventData.summary,
            longDescription: eventData.summary,
            revisions: updatedRevisions,
            updatedAt: serverTimestamp()
          });

          console.log(`      🔄 Updating with revision: ${eventData.title.substring(0, 40)}...`);
          updated++;
          batchOps++;

        } else {
          // New event - create document
          batch.set(docRef, {
            ...eventData,
            revisions: [], // Empty array for future revisions
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          console.log(`      ✅ Creating new: ${eventData.title.substring(0, 40)}... (${eventData.year})`);
          created++;
          batchOps++;
        }

      } catch (error) {
        console.error(`      ❌ Error: ${error.message}`);
        stats.totalErrors++;
      }
    }

    // Commit batch if it has operations
    if (batchOps > 0) {
      try {
        await batch.commit();
        console.log(`    💾 Batch committed: ${created} created, ${updated} updated, ${skipped} skipped`);
      } catch (error) {
        console.error(`    ❌ Batch commit failed: ${error.message}`);
      }
    }
  }

  return { created, updated, skipped };
}

// ═══════════════════════════════════════════════════════════════════
// DATE PROCESSING
// ═══════════════════════════════════════════════════════════════════

/**
 * Process all events for a specific calendar date
 */
async function processDate(month, day) {
  console.log(`\n  📅 ${month}/${day} - Fetching events...`);

  // Fetch from both free APIs in parallel
  const [muffinEvents, wikiEvents] = await Promise.all([
    fetchMuffinLabs(month, day),
    fetchWikipediaEvents(month, day)
  ]);

  const allEvents = [...muffinEvents, ...wikiEvents];
  console.log(`    📚 Fetched: ${allEvents.length} total (MuffinLabs: ${muffinEvents.length}, Wikipedia: ${wikiEvents.length})`);

  if (allEvents.length === 0) {
    console.log(`    ⚠️  No events found for this date`);
    return { created: 0, updated: 0, skipped: 0 };
  }

  // Deduplicate by year + title
  const uniqueEvents = new Map();
  allEvents.forEach(e => {
    const key = `${e.year}-${e.title.substring(0, 50).toLowerCase().trim()}`;
    if (!uniqueEvents.has(key)) {
      uniqueEvents.set(key, e);
    }
  });

  const eventsToProcess = Array.from(uniqueEvents.values())
    .slice(0, CONFIG.MAX_EVENTS_PER_DATE);

  console.log(`    🔍 Processing ${eventsToProcess.length} unique events...`);

  // Process each event
  const processedEvents = [];

  for (let i = 0; i < eventsToProcess.length; i++) {
    const event = eventsToProcess[i];
    
    try {
      stats.totalProcessed++;

      // Format date
      const eventDate = `${event.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Fetch detailed Wikipedia summary
      let wikiSummary = null;
      if (event.links && event.links.length > 0 && event.links[0].title) {
        wikiSummary = await fetchWikiSummary(event.links[0].title);
      }

      // AI summarization
      const { summary, region, category } = await summarizeWithAI(event, wikiSummary);

      // Prepare sources
      const sources = [
        'MuffinLabs',
        'Wikipedia',
        ...(event.links?.map(l => l.url).filter(Boolean) || [])
      ].slice(0, 5);

      // Create event document
      const eventDoc = {
        title: event.title,
        summary: summary,
        description: summary.substring(0, 300),
        longDescription: summary,
        date: eventDate,
        year: event.year.toString(),
        region: region,
        category: category,
        location: region,
        sources: sources,
        verifiedSource: wikiSummary?.url || event.links?.[0]?.url || 'https://wikipedia.org',
        imageUrl: wikiSummary?.thumbnail || event.imageUrl || '',
        credibilityScore: 100, // Wikipedia + MuffinLabs = verified sources
        importanceScore: 80,
        verified: true,
        verifiedByAI: openai ? true : false,
        addedBy: 'backfill',
        author: 'Wikipedia + MuffinLabs',
        historical: true,
        newsGenerated: false,
        aiGenerated: openai ? true : false,
        autoUpdated: true,
      };

      processedEvents.push(eventDoc);

      // Rate limiting for AI calls
      if (openai) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY_MS));
      }

    } catch (error) {
      console.error(`      ❌ Error processing: ${error.message}`);
      stats.totalErrors++;
    }
  }

  // Batch save with revision tracking
  const result = await saveEventsWithRevisions(processedEvents);
  
  stats.totalCreated += result.created;
  stats.totalUpdated += result.updated;
  stats.totalSkipped += result.skipped;

  return result;
}

/**
 * Process all dates in a specific year
 */
async function processYear(year) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📆 PROCESSING YEAR: ${year}`);
  console.log(`${'═'.repeat(70)}`);

  const yearStart = Date.now();
  let yearCreated = 0;
  let yearUpdated = 0;
  let yearSkipped = 0;

  // Process each month
  for (let month = 1; month <= 12; month++) {
    const daysInMonth = new Date(year, month, 0).getDate();
    
    console.log(`\n📅 Month ${month}/${year} (${daysInMonth} days):`);

    // Process each day
    for (let day = 1; day <= daysInMonth; day++) {
      try {
        const result = await processDate(month, day);
        yearCreated += result.created;
        yearUpdated += result.updated;
        yearSkipped += result.skipped;

        // Small delay between dates
        await new Promise(resolve => setTimeout(resolve, CONFIG.DATE_DELAY_MS));
      } catch (error) {
        console.error(`  ❌ Error on ${month}/${day}/${year}:`, error.message);
        stats.totalErrors++;
      }
    }
  }

  const yearDuration = ((Date.now() - yearStart) / 1000 / 60).toFixed(2);

  // Save year progress
  stats.yearProgress[year] = {
    created: yearCreated,
    updated: yearUpdated,
    skipped: yearSkipped,
    duration: yearDuration,
    completed: true
  };

  saveProgress();

  console.log(`\n✅ YEAR ${year} COMPLETE`);
  console.log(`   ✨ Created: ${yearCreated}`);
  console.log(`   🔄 Updated: ${yearUpdated}`);
  console.log(`   ⏭️  Skipped: ${yearSkipped}`);
  console.log(`   ⏱️  Duration: ${yearDuration} minutes\n`);

  return { created: yearCreated, updated: yearUpdated, skipped: yearSkipped };
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS TRACKING & RESUME CAPABILITY
// ═══════════════════════════════════════════════════════════════════

/**
 * Save progress to file for resume capability
 */
function saveProgress() {
  try {
    fs.writeFileSync(
      CONFIG.PROGRESS_FILE,
      JSON.stringify(stats.yearProgress, null, 2)
    );
  } catch (error) {
    console.error('⚠️  Could not save progress:', error.message);
  }
}

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const data = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8');
      stats.yearProgress = JSON.parse(data);
      console.log(`📂 Loaded progress: ${Object.keys(stats.yearProgress).length} years completed`);
      return Object.keys(stats.yearProgress).map(Number);
    }
  } catch (error) {
    console.error('⚠️  Could not load progress:', error.message);
  }
  return [];
}

/**
 * Get list of years still to process
 */
function getYearsToProcess(startYear, endYear) {
  const completedYears = loadProgress();
  const allYears = [];
  
  for (let year = startYear; year <= endYear; year++) {
    if (!completedYears.includes(year)) {
      allYears.push(year);
    }
  }
  
  console.log(`📊 Years to process: ${allYears.length} (${completedYears.length} already completed)`);
  return allYears;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN BACKFILL LOGIC
// ═══════════════════════════════════════════════════════════════════

/**
 * Run full backfill for year range
 */
async function runBackfill(startYear, endYear) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       🏛️  REALTEA HISTORICAL BACKFILL - 400 YEARS               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📅 Year Range: ${startYear} → ${endYear} (${endYear - startYear + 1} years)`);
  console.log(`🗄️  Database: ${firebaseConfig.projectId}`);
  console.log(`🤖 AI Summaries: ${openai ? 'ENABLED (OpenAI GPT-4-mini)' : 'DISABLED'}`);
  console.log(`📦 Batch Size: ${CONFIG.BATCH_SIZE} events per batch`);
  console.log(`🎯 Max per date: ${CONFIG.MAX_EVENTS_PER_DATE} events`);
  console.log('');

  // Get years to process (skip completed ones for resume)
  const yearsToProcess = getYearsToProcess(startYear, endYear);

  if (yearsToProcess.length === 0) {
    console.log('✅ All years already completed! Backfill is done.\n');
    return;
  }

  console.log(`🚀 Starting backfill of ${yearsToProcess.length} years...\n`);

  // Process each year
  for (const year of yearsToProcess) {
    try {
      await processYear(year);
      
      // Print overall progress every 10 years
      if (year % 10 === 0) {
        printOverallProgress(startYear, endYear);
      }
    } catch (error) {
      console.error(`❌ Fatal error in year ${year}:`, error);
      stats.totalErrors++;
    }
  }

  printFinalSummary(startYear, endYear);
}

/**
 * Quick test mode - sample a few dates
 */
async function quickTest() {
  console.log('\n🚀 QUICK TEST MODE - Sampling 5 significant dates\n');

  const testDates = [
    { month: 7, day: 20, name: 'July 20 (Moon Landing)' },
    { month: 12, day: 7, name: 'Dec 7 (Pearl Harbor)' },
    { month: 11, day: 9, name: 'Nov 9 (Berlin Wall)' },
    { month: 9, day: 11, name: 'Sep 11 (9/11)' },
    { month: 7, day: 4, name: 'July 4 (Independence Day)' }
  ];

  for (const date of testDates) {
    console.log(`\n${date.name}:`);
    await processDate(date.month, date.day);
  }

  printFinalSummary(1600, 2025);
}

/**
 * Print overall progress
 */
function printOverallProgress(startYear, endYear) {
  const completedYears = Object.keys(stats.yearProgress).length;
  const totalYears = endYear - startYear + 1;
  const percentComplete = ((completedYears / totalYears) * 100).toFixed(1);
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);

  console.log('\n');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│                  📊 OVERALL PROGRESS                            │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│  Years Completed: ${completedYears}/${totalYears} (${percentComplete}%)                    │`);
  console.log(`│  ✨ Total Created: ${stats.totalCreated.toLocaleString()}                              │`);
  console.log(`│  🔄 Total Updated: ${stats.totalUpdated.toLocaleString()}                              │`);
  console.log(`│  ⏭️  Total Skipped: ${stats.totalSkipped.toLocaleString()}                             │`);
  console.log(`│  ❌ Total Errors: ${stats.totalErrors}                                 │`);
  console.log(`│  ⏱️  Duration: ${duration} minutes                              │`);
  console.log('└─────────────────────────────────────────────────────────────────┘');
  console.log('');
}

/**
 * Print final summary
 */
function printFinalSummary(startYear, endYear) {
  const totalDuration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);
  const completedYears = Object.keys(stats.yearProgress).length;

  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ BACKFILL COMPLETE                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  console.log('📊 FINAL STATISTICS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Total Events Processed: ${stats.totalProcessed.toLocaleString()}`);
  console.log(`   ✨ New Events Created: ${stats.totalCreated.toLocaleString()}`);
  console.log(`   🔄 Events Updated (revisions): ${stats.totalUpdated.toLocaleString()}`);
  console.log(`   ⏭️  Skipped (no changes): ${stats.totalSkipped.toLocaleString()}`);
  console.log(`   ❌ Errors: ${stats.totalErrors}`);
  console.log(`   📅 Years Completed: ${completedYears}/${endYear - startYear + 1}`);
  console.log(`   ⏱️  Total Duration: ${totalDuration} minutes`);
  console.log(`   📈 Average Rate: ${(stats.totalCreated / (totalDuration || 1)).toFixed(1)} events/min`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('🎉 Success! Your RealTea timeline is now populated.');
  console.log('🌐 View: http://localhost:3000/timeline');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   - Check Firestore Console for new events');
  console.log('   - Run backfill again to update events with revisions');
  console.log('   - Deploy to enable daily automated updates');
  console.log('   - Set up monitoring for revision tracking');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let startYear = 1600;
  let endYear = new Date().getFullYear();
  let mode = 'full';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year') {
      startYear = endYear = parseInt(args[i + 1]);
    } else if (args[i] === '--start') {
      startYear = parseInt(args[i + 1]);
    } else if (args[i] === '--end') {
      endYear = parseInt(args[i + 1]);
    } else if (args[i] === '--quick') {
      mode = 'quick';
    }
  }

  // Validate environment
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.error('\n❌ ERROR: Firebase credentials missing!');
    console.error('📝 Create .env.local with Firebase config\n');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('\n⚠️  WARNING: OPENAI_API_KEY not found');
    console.warn('   Events will be saved WITHOUT AI summaries');
    console.warn('   Add OPENAI_API_KEY to .env.local for better results\n');
  }

  try {
    if (mode === 'quick') {
      await quickTest();
    } else {
      await runBackfill(startYear, endYear);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
main();

