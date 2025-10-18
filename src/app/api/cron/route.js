/**
 * API Route: /api/cron
 * Scheduled job that runs every 6 hours (via Vercel Cron or manual)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Cron handler - Calls fetchNews (every 6h) and fetchHistory (once daily)
 */
export async function GET(request) {
  console.log('⏰ [CRON] Scheduled job triggered');
  console.log(`⏰ [CRON] Time: ${new Date().toLocaleString()}`);

  const results = {
    news: null,
    history: null
  };

  try {
    // Always call fetchNews (every 6 hours)
    console.log('📰 [CRON] Triggering news fetch...');
    const newsResponse = await fetch('http://localhost:3000/api/fetchNews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const newsData = await newsResponse.json();
    results.news = newsData.results;

    if (newsData.success) {
      console.log('✅ [CRON] News fetch completed');
      console.log(`📊 [CRON] News: saved=${newsData.results?.saved}, updated=${newsData.results?.updated}`);
    } else {
      console.error('❌ [CRON] News fetch failed:', newsData.error);
    }

    // Check if we should run history fetch (once per day at midnight)
    const hour = new Date().getHours();
    const shouldFetchHistory = hour === 0 || hour === 1; // Run at midnight or 1am

    if (shouldFetchHistory) {
      console.log('📜 [CRON] Triggering history fetch (daily run)...');
      
      const historyResponse = await fetch('http://localhost:3000/api/fetchHistory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const historyData = await historyResponse.json();
      results.history = historyData.results;

      if (historyData.success) {
        console.log('✅ [CRON] History fetch completed');
        console.log(`📊 [CRON] History: saved=${historyData.results?.saved}`);
      } else {
        console.warn('⚠️ [CRON] History fetch skipped or failed');
      }
    } else {
      console.log(`⏭️ [CRON] Skipping history fetch (runs at midnight, current hour: ${hour})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('❌ [CRON] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      results
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

