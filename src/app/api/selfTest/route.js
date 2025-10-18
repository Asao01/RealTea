/**
 * API Route: /api/selfTest
 * Self-diagnostic endpoint for testing RealTea system health
 */

import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🧪 [SELF-TEST] Running diagnostics...');
    
    const results = {
      ok: true,
      counts: {},
      lastVerifications: [],
      trustSample: [],
      errors: []
    };

    // Check Firestore connection
    if (!db) {
      results.ok = false;
      results.errors.push('Firestore not initialized');
      return NextResponse.json(results, { status: 500 });
    }

    // Count events
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsRef);
    const allEvents = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    results.counts.eventsTotal = allEvents.length;

    // Count by enrichment status
    results.counts.needEnrichment = allEvents.filter(e => 
      (e.longDescription || '').length < 1200
    ).length;

    // Count by verification status
    results.counts.verifiedHigh = allEvents.filter(e => 
      (e.credibilityScore || 0) >= 75
    ).length;

    results.counts.flaggedLow = allEvents.filter(e => 
      e.flagged === true || (e.credibilityScore || 70) < 40
    ).length;

    results.counts.unverified = allEvents.filter(e => 
      e.verified === false || !e.lastVerified
    ).length;

    // Last 5 verification updates
    const recentlyVerified = allEvents
      .filter(e => e.lastVerified)
      .sort((a, b) => {
        const aTime = a.lastVerified?.toDate?.() || new Date(a.lastVerified || 0);
        const bTime = b.lastVerified?.toDate?.() || new Date(b.lastVerified || 0);
        return bTime - aTime;
      })
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        title: e.title?.substring(0, 60) + '...',
        credibilityScore: e.credibilityScore,
        verified: e.verified,
        lastVerified: e.lastVerified?.toDate?.()?.toISOString() || e.lastVerified
      }));

    results.lastVerifications = recentlyVerified;

    // Sample trust scores
    try {
      const trustRef = collection(db, 'sourceTrust');
      const trustSnapshot = await getDocs(query(trustRef, orderBy('trustScore', 'desc'), limit(10)));
      
      results.trustSample = trustSnapshot.docs.map(doc => ({
        domain: doc.id,
        trustScore: doc.data().trustScore || 0,
        verifications: doc.data().verificationCount || 0,
        successRate: doc.data().successCount && doc.data().verificationCount
          ? ((doc.data().successCount / doc.data().verificationCount) * 100).toFixed(1) + '%'
          : 'N/A'
      }));
    } catch (error) {
      console.warn('⚠️ [SELF-TEST] Could not fetch trust data:', error.message);
      results.trustSample = [];
    }

    // Environment check
    results.environment = {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      newsApiConfigured: !!process.env.NEWS_API_KEY,
      firebaseConfigured: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    };

    // Sample events
    results.sampleEvents = allEvents.slice(0, 3).map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      credibilityScore: e.credibilityScore,
      hasLongDescription: (e.longDescription || '').length > 500,
      verified: e.verified,
      flagged: e.flagged
    }));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SELF-TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Events: ${results.counts.eventsTotal} total`);
    console.log(`   • Need enrichment: ${results.counts.needEnrichment}`);
    console.log(`   • Verified high: ${results.counts.verifiedHigh}`);
    console.log(`   • Flagged low: ${results.counts.flaggedLow}`);
    console.log(`   • Unverified: ${results.counts.unverified}`);
    console.log(`🔧 Environment:`);
    console.log(`   • OpenAI: ${results.environment.openaiConfigured ? '✅' : '❌'}`);
    console.log(`   • NewsAPI: ${results.environment.newsApiConfigured ? '✅' : '❌'}`);
    console.log(`   • Firebase: ${results.environment.firebaseConfigured ? '✅' : '❌'}`);
    console.log('═══════════════════════════════════════════════════════════');

    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ [SELF-TEST] Fatal error:', error);
    
    return NextResponse.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

