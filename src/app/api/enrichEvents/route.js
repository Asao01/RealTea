/**
 * API Route: /api/enrichEvents
 * Expands short events into full 600-1000 word articles
 */

import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listEventsForEnrichment } from '@/lib/firestoreService';
import { enrichEvent } from '@/lib/realteaAI';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  try {
    console.log('📝 [ENRICH] Starting enrichment job...');
    
    const startTime = Date.now();
    const results = {
      processed: 0,
      enriched: 0,
      skipped: 0,
      errors: 0
    };

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firestore not initialized'
      }, { status: 500 });
    }

    // Get events needing enrichment
    const events = await listEventsForEnrichment();
    
    if (events.length === 0) {
      console.log('✅ [ENRICH] No events need enrichment');
      return NextResponse.json({
        success: true,
        message: 'No events need enrichment',
        results
      });
    }

    console.log(`📊 [ENRICH] Found ${events.length} events to enrich`);

    // Process each event
    for (const event of events) {
      try {
        results.processed++;
        
        console.log(`\n[${results.processed}/${events.length}] ${event.title?.substring(0, 60)}...`);
        console.log(`   Current length: ${(event.longDescription || '').length} chars`);

        // Enrich with AI
        const enriched = await enrichEvent(event);
        
        if (!enriched) {
          console.log('   ⚠️  Enrichment failed');
          results.errors++;
          continue;
        }

        // Update Firestore
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          longDescription: enriched.longDescription,
          description: enriched.description,
          enrichedAt: serverTimestamp(),
          enrichedBy: 'RealTea AI'
        });

        results.enriched++;
        console.log(`   ✅ Saved: ${enriched.wordCount} words, ${enriched.longDescription.length} chars`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ENRICHMENT JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${results.processed} | Enriched: ${results.enriched} | Errors: ${results.errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [ENRICH] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

