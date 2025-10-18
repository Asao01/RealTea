/**
 * Re-Rank API Route
 * Triggers rank score recalculation for all events
 */

import { NextResponse } from "next/server";
import { recalculateAllRanks } from "@/lib/rankUtils";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    console.log('🔄 [RERANK] Starting rank update...');
    
    const result = await recalculateAllRanks(db, {
      applyDiversityPenalty: true
    });

    return NextResponse.json({
      success: true,
      message: 'Ranks updated successfully',
      updated: result.updated,
      total: result.totalEvents,
      analysis: result.analysis
    });

  } catch (error) {
    console.error('❌ [RERANK] Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Rank update failed',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  return GET(); // Support both GET and POST
}

