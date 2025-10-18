/**
 * Scheduler: Cleanup Low-Quality Events
 * Removes events with credibilityScore < 40 that are older than 7 days
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧹 CLEANUP JOB - STARTING');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const results = {
      flagged: 0,
      deleted: 0,
      errors: 0
    };

    if (!db) {
      throw new Error('Firestore not initialized');
    }

    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);

    console.log(`📊 [CLEANUP] Found ${snapshot.size} total events`);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const eventDoc of snapshot.docs) {
      try {
        const eventData = eventDoc.data();
        
        // Check if event is flagged (low credibility or verified false)
        const isFlagged = eventData.verified === false || (eventData.credibilityScore ?? 70) < 40;
        
        if (!isFlagged) continue;

        // Get event age
        const updatedAt = eventData.updatedAt?.toDate?.() ?? 
                         (eventData.updatedAt ? new Date(eventData.updatedAt) : null) ??
                         eventData.createdAt?.toDate?.() ??
                         (eventData.createdAt ? new Date(eventData.createdAt) : new Date());
        
        const eventTime = updatedAt.getTime();
        const ageInDays = (Date.now() - eventTime) / (1000 * 60 * 60 * 24);
        const isOld = eventTime < sevenDaysAgo;

        if (isOld) {
          // Delete old flagged events
          await deleteDoc(eventDoc.ref);
          results.deleted++;
          console.log(`🗑️ [CLEANUP] Deleted: ${eventData.title?.substring(0, 60)}... (age: ${ageInDays.toFixed(1)} days, score: ${eventData.credibilityScore})`);

          // Log deletion
          await addDoc(collection(db, 'system_logs'), {
            actionType: 'event_deleted',
            performedBy: 'cleanup-bot',
            details: {
              eventId: eventDoc.id,
              title: eventData.title,
              credibilityScore: eventData.credibilityScore,
              ageInDays: ageInDays.toFixed(1),
              reason: 'Low credibility, not corrected after 7 days'
            },
            timestamp: serverTimestamp()
          });
        } else {
          // Just flag young low-credibility events
          results.flagged++;
          console.log(`⚠️ [CLEANUP] Flagged: ${eventData.title?.substring(0, 60)}... (age: ${ageInDays.toFixed(1)} days, score: ${eventData.credibilityScore})`);
        }

      } catch (error) {
        console.error(`❌ [CLEANUP] Error processing event:`, error);
        results.errors++;
      }
    }

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ CLEANUP JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Flagged: ${results.flagged} | Deleted: ${results.deleted} | Errors: ${results.errors}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      message: 'Cleanup job completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CLEANUP] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
