/**
 * API Route: Recalculate Credibility Scores
 * Run weekly via cron to update all event scores
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { calculateCredibilityScore, isContested } from "@/lib/firestoreService";

export async function GET(request) {
  const startTime = Date.now();
  console.log('\n🔄 ===== RECALCULATING CREDIBILITY SCORES =====');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'realtea-cron-secret';
    
    // Simple authorization check
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log('❌ Unauthorized request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!db) {
      throw new Error('Firestore not initialized');
    }
    
    // Get all events
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef);
    const snapshot = await getDocs(eventsQuery);
    
    console.log(`📊 Found ${snapshot.size} events to process`);
    
    let updated = 0;
    let unchanged = 0;
    let errors = 0;
    
    // Process each event
    for (const docSnap of snapshot.docs) {
      try {
        const eventData = docSnap.data();
        const currentScore = eventData.credibilityScore || 0;
        
        // Recalculate score
        const newScore = calculateCredibilityScore(eventData);
        const contested = isContested(eventData);
        
        // Only update if score changed
        if (newScore !== currentScore || contested !== eventData.contested) {
          await updateDoc(doc(db, 'events', docSnap.id), {
            credibilityScore: newScore,
            contested: contested,
            lastCredibilityUpdate: serverTimestamp()
          });
          
          updated++;
          console.log(`  ✅ ${docSnap.id}: ${currentScore} → ${newScore} (Contested: ${contested})`);
        } else {
          unchanged++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${docSnap.id}:`, error.message);
        errors++;
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n📊 ===== RECALCULATION SUMMARY =====');
    console.log(`✅ Updated: ${updated} events`);
    console.log(`➖ Unchanged: ${unchanged} events`);
    console.log(`❌ Errors: ${errors} events`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('🔄 ===== RECALCULATION COMPLETE =====\n');
    
    return NextResponse.json({
      success: true,
      message: 'Credibility scores recalculated',
      stats: {
        total: snapshot.size,
        updated,
        unchanged,
        errors
      },
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
        error: 'Failed to recalculate scores',
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

