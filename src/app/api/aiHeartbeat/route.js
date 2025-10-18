/**
 * AI Heartbeat - Autonomous System Coordinator
 * Orchestrates automated data fetching and fact-checking
 * 
 * This route sequentially calls multiple API endpoints to keep
 * the timeline fresh with verified events.
 * 
 * Can be triggered by:
 * - Vercel cron job (if under 2 job limit)
 * - External ping service (UptimeRobot, cron-job.org, etc.)
 * - Manual API call
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request) {
  const startTime = Date.now();
  const results = [];
  
  console.log('\n🤖 ===== AI HEARTBEAT STARTED =====');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Get base URL from environment or construct from request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'http://localhost:3000';
    
    console.log(`🌐 Base URL: ${baseUrl}`);
    
    // Optional: Check authorization to prevent abuse
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || process.env.AI_HEARTBEAT_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log('⚠️ Unauthorized request attempt');
      // Log but don't fail - allow public access for external cron services
      console.log('💡 Tip: Set CRON_SECRET env var for authenticated requests');
    }

    // ==========================================
    // 1️⃣ FETCH BREAKING NEWS
    // ==========================================
    console.log('\n📰 [1/3] Fetching breaking news...');
    try {
      const breakingResponse = await fetch(`${baseUrl}/api/fetchBreaking`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RealTea-AI-Heartbeat/1.0'
        },
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });
      
      const breakingData = await breakingResponse.json();
      
      if (breakingResponse.ok) {
        console.log('✅ Breaking news updated');
        console.log(`   📊 Stats:`, breakingData);
        results.push({
          step: 'fetchBreaking',
          success: true,
          data: breakingData,
          duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        });
      } else {
        throw new Error(breakingData.error || 'Breaking news fetch failed');
      }
    } catch (error) {
      console.error('❌ Breaking news failed:', error.message);
      results.push({
        step: 'fetchBreaking',
        success: false,
        error: error.message
      });
      // Continue to next step even if this fails
    }

    // ==========================================
    // 2️⃣ FACT CHECK EVENTS
    // ==========================================
    console.log('\n🔍 [2/3] Running fact-check...');
    try {
      const factCheckResponse = await fetch(`${baseUrl}/api/factCheck`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RealTea-AI-Heartbeat/1.0'
        },
        signal: AbortSignal.timeout(120000) // 2 minute timeout for AI processing
      });
      
      const factCheckData = await factCheckResponse.json();
      
      if (factCheckResponse.ok) {
        console.log('♻️ Fact-check complete');
        console.log(`   📊 Stats:`, factCheckData);
        results.push({
          step: 'factCheck',
          success: true,
          data: factCheckData,
          duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        });
      } else {
        throw new Error(factCheckData.error || 'Fact-check failed');
      }
    } catch (error) {
      console.error('❌ Fact-check failed:', error.message);
      results.push({
        step: 'factCheck',
        success: false,
        error: error.message
      });
      // Continue to next step
    }

    // ==========================================
    // 3️⃣ FETCH HISTORICAL EVENTS (GDELT)
    // ==========================================
    console.log('\n🕐 [3/4] Fetching historical events...');
    try {
      const historyResponse = await fetch(`${baseUrl}/api/fetchHistory`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RealTea-AI-Heartbeat/1.0'
        },
        signal: AbortSignal.timeout(60000) // 60 second timeout
      });
      
      const historyData = await historyResponse.json();
      
      if (historyResponse.ok) {
        console.log('🕐 Historical events refreshed');
        console.log(`   📊 Stats:`, historyData);
        results.push({
          step: 'fetchHistory',
          success: true,
          data: historyData,
          duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        });
      } else {
        throw new Error(historyData.error || 'History fetch failed');
      }
    } catch (error) {
      console.error('❌ Historical fetch failed:', error.message);
      results.push({
        step: 'fetchHistory',
        success: false,
        error: error.message
      });
    }

    // ==========================================
    // 4️⃣ ENRICH EVENTS WITH FULL CONTEXT
    // ==========================================
    console.log('\n📝 [4/4] Enriching events with AI context...');
    try {
      const enrichResponse = await fetch(`${baseUrl}/api/enrichEventFull?limit=3`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RealTea-AI-Heartbeat/1.0'
        },
        signal: AbortSignal.timeout(180000) // 3 minute timeout for GPT-4
      });
      
      const enrichData = await enrichResponse.json();
      
      if (enrichResponse.ok) {
        console.log('📝 Event enrichment complete');
        console.log(`   📊 Stats:`, enrichData);
        results.push({
          step: 'enrichEventFull',
          success: true,
          data: enrichData,
          duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        });
      } else {
        throw new Error(enrichData.error || 'Enrichment failed');
      }
    } catch (error) {
      console.error('❌ Event enrichment failed:', error.message);
      results.push({
        step: 'enrichEventFull',
        success: false,
        error: error.message
      });
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n═══════════════════════════════════════');
    console.log('🤖 AI HEARTBEAT COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Success: ${successCount}/4`);
    console.log(`❌ Failed: ${failCount}/4`);
    console.log(`⏱️  Total Duration: ${totalDuration}s`);
    console.log('═══════════════════════════════════════\n');

    // Return summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationSeconds: parseFloat(totalDuration),
      summary: {
        total: results.length,
        successful: successCount,
        failed: failCount
      },
      results,
      message: `AI Heartbeat completed: ${successCount}/${results.length} steps successful`
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('❌ AI Heartbeat fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      durationSeconds: parseFloat(duration),
      results
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}

// Support POST requests too (for external cron services)
export async function POST(request) {
  return GET(request);
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
