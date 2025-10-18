/**
 * Cron Job - Fetch Events
 * Automatically fetches and updates events every 15 minutes
 * Can be triggered manually or via Vercel cron
 */

import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    console.log('⏰ [CRON] Starting automated event fetch...');
    
    const results = {
      timestamp: new Date().toISOString(),
      breaking: { fetched: 0, saved: 0, updated: 0, skipped: 0 },
      news: { fetched: 0, saved: 0, updated: 0, skipped: 0 },
      errors: []
    };

    // 1. Fetch breaking news
    try {
      console.log('📰 [CRON] Fetching breaking news...');
      const breakingResponse = await fetch(`${getBaseUrl(request)}/api/fetchBreaking`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (breakingResponse.ok) {
        const breakingData = await breakingResponse.json();
        results.breaking = breakingData.summary || results.breaking;
        console.log('✅ [CRON] Breaking news fetched:', results.breaking);
      } else {
        throw new Error(`Breaking news fetch failed: ${breakingResponse.status}`);
      }
    } catch (error) {
      console.error('❌ [CRON] Breaking news error:', error);
      results.errors.push(`Breaking: ${error.message}`);
    }

    // 2. Fetch general news
    try {
      console.log('📰 [CRON] Fetching general news...');
      const newsResponse = await fetch(`${getBaseUrl(request)}/api/fetchNews`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        results.news = newsData.summary || results.news;
        console.log('✅ [CRON] General news fetched:', results.news);
      } else {
        throw new Error(`News fetch failed: ${newsResponse.status}`);
      }
    } catch (error) {
      console.error('❌ [CRON] News error:', error);
      results.errors.push(`News: ${error.message}`);
    }

    // Summary
    const totalFetched = results.breaking.fetched + results.news.fetched;
    const totalSaved = results.breaking.saved + results.news.saved;
    const totalUpdated = results.breaking.updated + results.news.updated;
    const totalSkipped = results.breaking.skipped + results.news.skipped;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CRON JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Fetched: ${totalFetched} | Saved: ${totalSaved} | Updated: ${totalUpdated} | Skipped: ${totalSkipped}`);
    if (results.errors.length > 0) {
      console.log(`❌ Errors: ${results.errors.length}`);
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      message: 'Automated event fetch completed',
      results,
      summary: {
        totalFetched,
        totalSaved,
        totalUpdated,
        totalSkipped,
        errors: results.errors.length
      }
    });

  } catch (error) {
    console.error('❌ [CRON] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Helper to get base URL
 */
function getBaseUrl(request) {
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

// Support POST as well
export async function POST(request) {
  return GET(request);
}

