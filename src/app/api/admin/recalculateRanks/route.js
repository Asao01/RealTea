/**
 * Recalculate Rank Scores API Route
 * Recalculates rank scores for all events in Firestore
 */

import { NextResponse } from "next/server";
import { recalculateAllRanks } from "@/lib/rankUtils";
import { db } from "@/lib/firebase";

export async function POST(request) {
  try {
    console.log('🔄 [API] Starting rank recalculation...');

    const result = await recalculateAllRanks(db, {
      applyDiversityPenalty: true
    });

    return NextResponse.json({
      success: true,
      message: `Recalculated ranks for ${result.totalEvents} events`,
      result
    });

  } catch (error) {
    console.error('❌ [API] Rank recalculation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Rank Recalculation API',
    usage: 'POST to /api/admin/recalculateRanks to recalculate all event ranks',
    info: 'This will update rankScore for all events based on credibility, freshness, engagement, and other signals'
  });
}

