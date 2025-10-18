/**
 * Fetch Historical Events from GDELT
 * Imports verified historical events and news articles
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Generate a simple summary from title using basic AI
 */
async function generateSummary(title, url) {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  // Fallback if no API key
  if (!apiKey) {
    return `${title} - Summary pending verification. Source: ${url || 'Unknown'}`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a news summarizer. Create a brief 2-3 sentence summary from the given headline.'
          },
          {
            role: 'user',
            content: `Summarize this news headline in 2-3 factual sentences:\n\n${title}`
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error('AI summary failed');
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content?.trim();
    
    return summary || `${title} - Summary pending verification.`;
  } catch (error) {
    console.log(`⚠️ AI summary failed, using fallback`);
    return `${title} - Summary pending verification.`;
  }
}

/**
 * Transform GDELT record to Firestore format
 */
async function transformGDELTRecord(record, includeAISummary = false) {
  // Parse GDELT date format (YYYYMMDDHHMMSS) to ISO
  const parseGDELTDate = (seendate) => {
    if (!seendate || seendate.length < 8) return new Date().toISOString();
    
    const year = seendate.substring(0, 4);
    const month = seendate.substring(4, 6);
    const day = seendate.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  };

  const title = record.title || "Untitled Event";
  const date = parseGDELTDate(record.seendate);
  
  // Generate description
  let description = "Summary pending verification...";
  if (includeAISummary) {
    try {
      description = await generateSummary(title, record.url);
    } catch (error) {
      console.log(`⚠️ Summary generation failed: ${error.message}`);
    }
  }

  return {
    title: title,
    description: description,
    longDescription: `${title}\n\n${description}\n\nSource: ${record.domain || 'Unknown Source'}\nCountry: ${record.sourcecountry || 'Unknown'}\nLanguage: ${record.language || 'en'}`,
    date: date,
    location: record.sourcecountry || "Global",
    category: "World",
    region: record.sourcecountry || "Global",
    sources: [record.url || ""].filter(Boolean),
    verifiedSource: record.url || "",
    imageUrl: record.socialimage || "",
    credibilityScore: 90,
    importanceScore: 70,
    verified: true,
    addedBy: "RealTea GDELT Bot",
    author: record.domain || "GDELT",
    newsGenerated: true,
    aiGenerated: includeAISummary,
    historical: true,
    gdeltData: {
      domain: record.domain || "",
      language: record.language || "en",
      seendate: record.seendate || ""
    }
  };
}

/**
 * Create unique document ID from title and date
 */
function createDocId(title, date) {
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 150);
  
  const cleanDate = date.replace(/[^0-9-]/g, '');
  
  return `${cleanTitle}-${cleanDate}`;
}

export async function GET(request) {
  const startTime = Date.now();
  let processed = 0;
  let saved = 0;
  let errors = 0;
  let skipped = 0;

  try {
    console.log('📚 [GDELT] Starting historical events fetch...');
    
    // Check database
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Construct GDELT API URL
    // Example: query for world news from last 24 hours
    const gdeltQuery = encodeURIComponent('world OR politics OR science OR technology');
    const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQuery}&mode=artlist&maxrecords=50&format=json&sort=datedesc`;
    
    console.log(`📡 [GDELT] Fetching from GDELT API...`);
    console.log(`   Query: ${gdeltQuery}`);
    
    const response = await fetch(gdeltUrl, {
      headers: {
        'User-Agent': 'RealTea-Timeline/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const articles = data.articles || [];

    console.log(`📰 [GDELT] Found ${articles.length} articles`);

    if (articles.length === 0) {
      console.log('⚠️ [GDELT] No articles returned from API');
      return NextResponse.json({
        success: true,
        processed: 0,
        saved: 0,
        errors: 0,
        durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2)
      });
    }

    // Process in batches for Firestore (max 500 per batch)
    const batchSize = 500;
    
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchArticles = articles.slice(i, i + batchSize);
      
      for (const article of batchArticles) {
        try {
          processed++;

          // Validate required fields
          if (!article.title) {
            console.log(`  ⏭️ Skipping article without title`);
            skipped++;
            continue;
          }

          // Transform to Firestore format
          const eventData = await transformGDELTRecord(article, false); // Set to true to enable AI summaries
          
          // Create unique ID from title + date
          const docId = createDocId(eventData.title, eventData.date);
          const docRef = doc(db, 'events', docId);
          
          // Check if already exists
          const existingDoc = await getDoc(docRef);
          if (existingDoc.exists()) {
            const existingData = existingDoc.data();
            const updatedAt = existingData.updatedAt?.toMillis?.() || 0;
            const twelveHours = 12 * 60 * 60 * 1000;
            
            // Skip if updated recently
            if (Date.now() - updatedAt < twelveHours) {
              skipped++;
              continue;
            }
          }

          // Add timestamps
          const now = new Date();
          eventData.createdAt = existingDoc.exists() ? (existingDoc.data().createdAt || now) : now;
          eventData.updatedAt = now;
          
          // Add to batch
          batch.set(docRef, eventData, { merge: false });
          
          console.log(`  ✅ Queued: ${eventData.title.substring(0, 60)}...`);
          saved++;

        } catch (error) {
          console.error(`  ❌ Error processing article:`, error.message);
          errors++;
        }
      }

      // Commit batch
      if (saved > 0) {
        try {
          await batch.commit();
          console.log(`📦 [GDELT] Committed batch of ${saved} events`);
        } catch (error) {
          console.error(`❌ [GDELT] Batch commit failed:`, error);
          errors += saved;
          saved = 0;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ GDELT HISTORY FETCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${processed} | Saved: ${saved} | Skipped: ${skipped} | Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      processed,
      saved,
      errors,
      durationSeconds: parseFloat(duration)
    });

  } catch (error) {
    console.error('❌ [GDELT] Fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      processed,
      saved,
      errors: errors + 1,
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
