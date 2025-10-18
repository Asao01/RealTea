/**
 * AI Event Analysis API Route
 * Analyzes a single event or batch of events using AI
 */

import { NextResponse } from "next/server";
import { analyzeEvent, updateEventAnalysis, batchAnalyzeEvents } from "@/lib/aiUtils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, limit, where } from "firebase/firestore";

export async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, event, mode } = body;

    // Mode 1: Analyze single event
    if (mode === 'single' && event) {
      console.log(`🤖 [API] Analyzing single event: ${event.title}`);
      
      const analysis = await analyzeEvent(event);
      
      if (!analysis) {
        return NextResponse.json({
          success: false,
          error: 'AI analysis failed - API key may be missing'
        }, { status: 500 });
      }

      // Update Firestore if eventId provided
      if (eventId) {
        await updateEventAnalysis(eventId, analysis);
      }

      return NextResponse.json({
        success: true,
        analysis,
        message: 'Event analyzed successfully'
      });
    }

    // Mode 2: Batch analyze unanalyzed events
    if (mode === 'batch') {
      console.log(`🤖 [API] Starting batch analysis...`);
      
      // Fetch unanalyzed events from Firestore
      const eventsRef = collection(db, 'events');
      const batchQuery = query(
        eventsRef,
        where('analyzedAt', '==', null),
        limit(50) // Process 50 at a time
      );
      
      const snapshot = await getDocs(batchQuery);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (events.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No unanalyzed events found',
          results: { total: 0, analyzed: 0, failed: 0, skipped: 0 }
        });
      }

      const results = await batchAnalyzeEvents(events, {
        maxConcurrent: 3,
        delayMs: 1000
      });

      return NextResponse.json({
        success: true,
        results,
        message: `Analyzed ${results.analyzed} events`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request - provide either single event or batch mode'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ [API] Analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({
      message: 'AI Event Analysis API',
      usage: {
        single: 'POST with { mode: "single", event: {...}, eventId?: "..." }',
        batch: 'POST with { mode: "batch" }',
      },
      info: 'Analyzes events using AI for credibility, bias, and summarization'
    });
  }

  // Return analysis status for specific event
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 });
    }

    const eventData = eventSnap.data();

    return NextResponse.json({
      success: true,
      analysis: {
        aiSummary: eventData.aiSummary,
        credibilityScore: eventData.credibilityScore,
        biasLabel: eventData.biasLabel,
        factCheckStatus: eventData.factCheckStatus,
        analyzedAt: eventData.analyzedAt,
        analyzedBy: eventData.analyzedBy
      },
      hasAnalysis: !!eventData.analyzedAt
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

