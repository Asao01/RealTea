/**
 * Comprehensive AI Updater
 * Runs every 6 hours to:
 * 1. Fetch from multiple news sources
 * 2. Enrich events with GPT-4 context
 * 3. Fact-check and update credibility scores
 * 4. Mark uncertain information for review
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

export async function GET(request) {
  const startTime = Date.now();
  const results = [];

  try {
    console.log('\n🤖 ===== COMPREHENSIVE UPDATE CYCLE =====');
    console.log(`⏰ ${new Date().toISOString()}`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Step 1: Multi-Source News Fetch
    console.log('\n📡 [1/3] Fetching from multiple sources...');
    try {
      const response = await fetch(`${baseUrl}/api/fetchMultiSource`, {
        signal: AbortSignal.timeout(120000)
      });
      const data = await response.json();
      results.push({ step: 'fetchMultiSource', success: response.ok, data });
      console.log(response.ok ? '✅ Multi-source fetch complete' : '❌ Multi-source fetch failed');
    } catch (error) {
      results.push({ step: 'fetchMultiSource', success: false, error: error.message });
      console.error('❌ Multi-source fetch failed:', error.message);
    }

    // Step 2: Enrich Events with GPT-4
    console.log('\n📝 [2/3] Enriching events with AI...');
    try {
      const response = await fetch(`${baseUrl}/api/enrichEventFull?limit=5`, {
        signal: AbortSignal.timeout(180000)
      });
      const data = await response.json();
      results.push({ step: 'enrichEventFull', success: response.ok, data });
      console.log(response.ok ? '✅ Event enrichment complete' : '❌ Enrichment failed');
    } catch (error) {
      results.push({ step: 'enrichEventFull', success: false, error: error.message });
      console.error('❌ Enrichment failed:', error.message);
    }

    // Step 3: Fact-Check
    console.log('\n🔍 [3/3] Running fact-check...');
    try {
      const response = await fetch(`${baseUrl}/api/factCheck`, {
        signal: AbortSignal.timeout(120000)
      });
      const data = await response.json();
      results.push({ step: 'factCheck', success: response.ok, data });
      console.log(response.ok ? '✅ Fact-check complete' : '❌ Fact-check failed');
    } catch (error) {
      results.push({ step: 'factCheck', success: false, error: error.message });
      console.error('❌ Fact-check failed:', error.message);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;

    console.log('\n═══════════════════════════════════════');
    console.log('🤖 COMPREHENSIVE UPDATE COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Success: ${successCount}/3`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationSeconds: parseFloat(duration),
      summary: { total: 3, successful: successCount, failed: 3 - successCount },
      results
    });

  } catch (error) {
    console.error('❌ Comprehensive update fatal error:', error);
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


