/**
 * API Route: Recalculate Trust Scores
 * Run every 6 hours via cron to update user trust scores
 */

import { NextResponse } from "next/server";
import { recalculateAllTrustScores } from "@/lib/trustScoreUpdater";

export async function GET(request) {
  const startTime = Date.now();
  console.log('\n🔄 ===== RECALCULATING TRUST SCORES =====');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Simple authorization check
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'realtea-cron-secret';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log('❌ Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Recalculate all scores
    const result = await recalculateAllTrustScores();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 ===== RECALCULATION SUMMARY =====');
    console.log(`✅ Updated: ${result.updated} users`);
    console.log(`➖ Unchanged: ${result.unchanged} users`);
    console.log(`📊 Total: ${result.total} users`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('🔄 ===== RECALCULATION COMPLETE =====\n');
    
    return NextResponse.json({
      success: true,
      message: 'Trust scores recalculated',
      stats: result,
      duration: `${duration}s`
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
    
  } catch (error) {
    console.error('❌ Recalculation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to recalculate trust scores',
        details: error.message
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

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

