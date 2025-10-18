import { NextResponse } from 'next/server';
import { generateRecentEvents } from '@/lib/autoEvents';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Daily Update API Route
 * Fetches latest news and generates events
 * Can be called manually or via cron
 * Updates system status in Firestore
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const startTime = new Date();
  
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Daily update started at:', startTime.toISOString());

    // Generate events from latest news
    const ids = await generateRecentEvents();

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // seconds

    console.log(`✅ Daily update complete: Generated ${ids.length} events in ${duration}s`);

    // Update status in Firestore
    try {
      const statusRef = doc(db, 'system', 'autoUpdateStatus');
      await setDoc(statusRef, {
        lastRun: serverTimestamp(),
        addedCount: ids.length,
        success: true,
        duration: duration,
        type: 'news-generation',
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreError) {
      console.warn('Failed to update status in Firestore:', firestoreError);
    }

    return NextResponse.json({
      success: true,
      generated: ids.length,
      duration: duration,
      timestamp: endTime.toISOString(),
      message: `Successfully generated ${ids.length} events from latest news`,
    });

  } catch (error) {
    console.error('❌ Daily update failed:', error);

    // Update failure status in Firestore
    try {
      const statusRef = doc(db, 'system', 'autoUpdateStatus');
      await setDoc(statusRef, {
        lastRun: serverTimestamp(),
        addedCount: 0,
        success: false,
        error: error.message,
        type: 'news-generation',
        updatedAt: serverTimestamp(),
      });
    } catch (firestoreError) {
      console.warn('Failed to update failure status:', firestoreError);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request) {
  return GET(request);
}

