/**
 * API Route: /api/cleanup
 * Nightly cleanup - removes flagged events older than 7 days
 */

import { NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🧹 [CLEANUP] Starting cleanup job...');
    
    const startTime = Date.now();
    let removed = 0;
    let errors = 0;

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firestore not initialized'
      }, { status: 500 });
    }

    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);

    console.log(`📊 [CLEANUP] Checking ${snapshot.size} events`);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const eventDoc of snapshot.docs) {
      try {
        const eventData = eventDoc.data();
        
        // Only process flagged events
        if (eventData.flagged !== true) continue;

        // Get last update timestamp
        const updatedAt = eventData.updatedAt?.toDate?.() ||
                         eventData.enrichedAt?.toDate?.() ||
                         eventData.createdAt?.toDate?.() ||
                         new Date();
        
        const eventTime = updatedAt.getTime();
        const ageInDays = (Date.now() - eventTime) / (1000 * 60 * 60 * 24);

        // Delete if flagged and older than 7 days
        if (eventTime < sevenDaysAgo) {
          await deleteDoc(eventDoc.ref);
          removed++;
          
          console.log(`🗑️  Removed: ${eventData.title?.substring(0, 50)}... (age: ${ageInDays.toFixed(1)}d, score: ${eventData.credibilityScore})`);

          // Log deletion
          await addDoc(collection(db, 'system_logs'), {
            actionType: 'event_deleted',
            performedBy: 'cleanup-cron',
            details: {
              eventId: eventDoc.id,
              title: eventData.title,
              credibilityScore: eventData.credibilityScore,
              ageInDays: ageInDays.toFixed(1),
              reason: 'Flagged for 7+ days'
            },
            timestamp: serverTimestamp()
          });
        }

      } catch (error) {
        console.error(`❌ [CLEANUP] Error processing event:`, error);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CLEANUP JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Removed: ${removed} flagged events | Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results: {
        removed,
        errors,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CLEANUP] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

