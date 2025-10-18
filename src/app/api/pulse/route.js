/**
 * API Route: /api/pulse
 * Lightweight check for breaking news (called every 5 minutes from client)
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory timestamp to prevent too-frequent calls
let lastPulseTime = 0;

/**
 * Pulse handler - Checks for breaking news
 */
export async function GET(request) {
  const now = Date.now();
  
  // Only run if > 4 minutes since last pulse
  if (now - lastPulseTime < 240000) {
    return NextResponse.json({
      success: true,
      message: 'Pulse skipped (too soon)',
      nextPulse: Math.ceil((240000 - (now - lastPulseTime)) / 1000)
    });
  }

  lastPulseTime = now;
  console.log('💓 [PULSE] Checking for breaking news...');

  try {
    // Call fetchBreaking API
    const response = await fetch('http://localhost:3000/api/fetchBreaking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ [PULSE] Check complete: ${data.results?.saved || 0} new breaking events`);
      
      return NextResponse.json({
        success: true,
        message: 'Pulse complete',
        timestamp: new Date().toISOString(),
        hasNewEvents: (data.results?.saved || 0) > 0,
        results: data.results
      });
    } else {
      console.warn('⚠️ [PULSE] Check failed:', data.error);
      
      return NextResponse.json({
        success: false,
        error: data.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [PULSE] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

