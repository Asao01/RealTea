/**
 * Scheduler: Fact-Check Events
 * Runs every 6 hours via Vercel Cron
 */

import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    console.log('⏰ [SCHEDULER] Triggering fact-check job...');

    // Call the factCheck endpoint
    const baseUrl = getBaseUrl(request);
    const response = await fetch(`${baseUrl}/api/factCheck`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`factCheck returned ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ [SCHEDULER] Fact-check completed:', data.results);

    return NextResponse.json({
      success: true,
      message: 'Fact-check scheduled job completed',
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SCHEDULER] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getBaseUrl(request) {
  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function POST(request) {
  return GET(request);
}

