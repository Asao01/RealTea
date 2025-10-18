/**
 * API Route: /api/fetchNews
 * Fetches top 20 headlines and converts to timeline events
 */

import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rateLimiter';
import { fetchTopHeadlines, normalizeArticle } from '../../../lib/news';
import { summarizeAndExtractEvent, withRetry } from '../../../lib/ai';
import { generateUrlHash } from '../../../lib/hash';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Process and save news to Firestore
 */
async function processNews(maxArticles = 20) {
  console.log('═══════════════════════════════════════════════');
  console.log('📰 [FETCH NEWS] Starting');
  console.log('═══════════════════════════════════════════════');
  
  const startTime = Date.now();
  let processed = 0;
  let saved = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Dynamic imports for Firestore
    const { db } = await import('../../../lib/firebase');
    const { collection, getDocs, addDoc, updateDoc, doc, query, where, serverTimestamp } = await import('firebase/firestore');

    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Fetch articles
    const articles = await fetchTopHeadlines(maxArticles);
    
    if (!articles || articles.length === 0) {
      console.log('⚠️ [FETCH NEWS] No articles fetched');
      return { processed: 0, saved: 0, updated: 0, skipped: 0, errors: 0 };
    }

    console.log(`📊 [FETCH NEWS] Processing ${articles.length} articles...`);

    const eventsRef = collection(db, 'events');

    // Process each article
    for (const rawArticle of articles) {
      try {
        processed++;
        
        // Normalize article
        const article = normalizeArticle(rawArticle);
        
        if (!article.title || !article.url) {
          console.log(`⏭️ Skipping: No title or URL`);
          skipped++;
          continue;
        }

        // Generate URL hash for deduplication
        const urlHash = await generateUrlHash(article.url, article.title, article.source.name);

        // Check if exists in Firestore (by urlHash AND title)
        const existingQuery = query(eventsRef, where('urlHash', '==', urlHash));
        const existing = await getDocs(existingQuery);
        
        // Also check by title to catch variations
        if (existing.empty) {
          const titleQuery = query(eventsRef, where('title', '==', article.title), limit(1));
          const titleExisting = await getDocs(titleQuery);
          if (!titleExisting.empty) {
            console.log(`  🔄 [${processed}] Duplicate found by title: ${article.title.substring(0, 60)}...`);
            skipped++;
            continue;
          }
        }

        // AI extraction with retry
        const eventData = await withRetry(() => summarizeAndExtractEvent(article));

        // Prepare event object
        const event = {
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          location: eventData.location,
          year: new Date(article.publishedAt).getUTCFullYear().toString(),
          date: article.publishedAt.split('T')[0],
          url: article.url,
          urlHash,
          urgency: eventData.urgency,
          isBreaking: eventData.isBreaking,
          imageUrl: article.urlToImage,
          verifiedSource: article.url,
          source: article.source,
          verifiedSources: [article.url],
          addedBy: 'News Bot',
          newsGenerated: true,
          aiGenerated: true,
          upvotes: 0,
          downvotes: 0,
          credibilityScore: 50,
          verified: false,
          contested: false
        };

        // If exists, update urgency/breaking status
        if (!existing.empty) {
          const existingDoc = existing.docs[0];
          await updateDoc(doc(db, 'events', existingDoc.id), {
            urgency: event.urgency,
            isBreaking: event.isBreaking,
            description: event.description,
            updatedAt: serverTimestamp()
          });
          console.log(`🔄 [FETCH NEWS] Updated: "${event.title.substring(0, 40)}..."`);
          updated++;
        } else {
          // Add new event with timestamps
          event.createdAt = serverTimestamp();
          event.updatedAt = serverTimestamp();
          
          const docRef = await addDoc(eventsRef, event);
          console.log(`✅ [FETCH NEWS] Saved: "${event.title.substring(0, 40)}..." (${docRef.id})`);
          saved++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1200));
      } catch (error) {
        console.error(`❌ [FETCH NEWS] Error processing article: ${error.message}`);
        errors++;
      }
    }

    // Update system status
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'system', 'status'), {
      lastFetchAt: serverTimestamp(),
      lastCounts: {
        news: saved + updated
      }
    }, { merge: true });

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════');
    console.log('✅ [FETCH NEWS] Complete');
    console.log(`📊 Results:`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Saved: ${saved}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════');

    return { processed, saved, updated, skipped, errors, duration: parseFloat(duration) };
  } catch (error) {
    console.error('❌ [FETCH NEWS] Fatal error:', error);
    throw error;
  }
}

/**
 * GET handler
 */
export async function GET(request) {
  // Rate limiting
  if (!checkRateLimit('fetchNews')) {
    return NextResponse.json({
      success: false,
      error: 'Rate limited. Try again in 1 minute.'
    }, { status: 429 });
  }

  try {
    const results = await processNews(20);
    
    return NextResponse.json({
      success: true,
      message: 'News processed successfully',
      results
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ [FETCH NEWS] Error:', error);
    console.error('📋 [FETCH NEWS] Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Check server logs for more information'
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
}

/**
 * POST handler
 */
export async function POST(request) {
  return GET(request);
}
