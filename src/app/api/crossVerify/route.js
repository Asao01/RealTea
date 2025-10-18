/**
 * API Route: /api/crossVerify
 * Multi-source verification with bias correction
 */

import { NextResponse } from 'next/server';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listEventsForVerification } from '@/lib/firestoreService';
import { verifyEvent } from '@/lib/realteaAI';
import { updateTrust, calculateTrustBonus } from '@/lib/sourceTrust';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Fetch corroboration from NewsAPI
 */
async function fetchNewsAPICorroboration(eventTitle) {
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) return '';

    const searchQuery = encodeURIComponent(eventTitle.substring(0, 100));
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${searchQuery}&pageSize=3&sortBy=relevancy&apiKey=${newsApiKey}`,
      { cache: 'no-store' }
    );

    if (!response.ok) return '';

    const data = await response.json();
    const articles = data.articles || [];

    if (articles.length === 0) return '';

    const corroboration = articles
      .map((a, i) => `Source ${i + 1}: ${a.source?.name || 'Unknown'} - "${a.title}" (${a.url})`)
      .join('\n');

    return `NewsAPI Results (${articles.length} articles):\n${corroboration}`;
  } catch (error) {
    console.warn('⚠️ [VERIFY] NewsAPI error:', error.message);
    return '';
  }
}

/**
 * Check for reputable domains in sources
 */
function getReputableDomains(sources) {
  const reputable = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'theguardian.com',
    'nytimes.com', 'washingtonpost.com', 'aljazeera.com', 'bloomberg.com',
    'nasa.gov', 'who.int', 'nature.com', 'science.org', 'thelancet.com'
  ];

  return sources.filter(source => {
    return reputable.some(domain => source.toLowerCase().includes(domain));
  });
}

export async function GET(request) {
  try {
    console.log('🔍 [CROSS-VERIFY] Starting multi-source verification...');
    
    const startTime = Date.now();
    const results = {
      processed: 0,
      verified: 0,
      flagged: 0,
      corrected: 0,
      errors: 0
    };

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firestore not initialized'
      }, { status: 500 });
    }

    // Get events needing verification
    const events = await listEventsForVerification();
    
    if (events.length === 0) {
      console.log('✅ [CROSS-VERIFY] No events need verification');
      return NextResponse.json({
        success: true,
        message: 'No events need verification',
        results
      });
    }

    console.log(`📊 [CROSS-VERIFY] Found ${events.length} events to verify`);

    // Process each event
    for (const event of events) {
      try {
        results.processed++;
        
        console.log(`\n[${results.processed}/${events.length}] ${event.title?.substring(0, 60)}...`);

        // Step 1: Fetch corroboration from multiple sources
        console.log('   🔍 Fetching corroboration...');
        const newsCorroboration = await fetchNewsAPICorroboration(event.title);
        
        const sourcesInfo = event.sources?.length > 0
          ? `Event Sources (${event.sources.length}):\n${event.sources.join('\n')}`
          : 'No sources provided';

        const corroborationData = [newsCorroboration, sourcesInfo].filter(Boolean).join('\n\n');

        // Step 2: Verify with AI
        console.log('   🤖 AI verification...');
        const verification = await verifyEvent(event, corroborationData);
        
        if (!verification) {
          results.errors++;
          continue;
        }

        // Step 3: Calculate enhanced credibility score
        let credibilityScore = verification.credibilityScore;
        
        // Bonus for reputable sources
        const reputableSources = getReputableDomains(event.sources || []);
        if (reputableSources.length > 0) {
          credibilityScore = Math.min(100, credibilityScore + 10);
          console.log(`   📰 Reputable sources bonus: +10 (${reputableSources.length} found)`);
        }

        // Bonus for multiple independent sources
        if ((verification.corroboratedSources || []).length >= 2) {
          credibilityScore = Math.min(100, credibilityScore + 5);
          console.log(`   🔗 Cross-reference bonus: +5`);
        }

        // Apply domain trust bonus
        const trustBonus = await calculateTrustBonus(event.sources || []);
        if (trustBonus > 0) {
          credibilityScore = Math.min(100, credibilityScore + trustBonus);
          console.log(`   ⭐ Trust bonus: +${trustBonus.toFixed(1)}`);
        }

        // Determine verification status
        const isVerified = credibilityScore >= 75;
        const isFlagged = credibilityScore < 40;

        console.log(`   📊 Final score: ${credibilityScore}/100 (${isVerified ? 'VERIFIED' : isFlagged ? 'FLAGGED' : 'PENDING'})`);

        // Step 4: Update Firestore
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          credibilityScore: Math.round(credibilityScore),
          verified: isVerified,
          flagged: isFlagged,
          flagReason: isFlagged ? 'Low credibility after multi-source verification' : null,
          corroboratedSources: verification.corroboratedSources || [],
          verificationSummary: verification.verificationSummary,
          concerns: verification.concerns || [],
          lastVerified: serverTimestamp(),
          verifiedBy: 'RealTea Cross-Verify'
        });

        // Step 5: Add AI comment
        if (verification.verificationSummary) {
          await addDoc(collection(db, `events/${event.id}/ai_comments`), {
            text: verification.verificationSummary,
            author: 'RealTea AI',
            userId: 'system-ai',
            isAI: true,
            credibilityScore: Math.round(credibilityScore),
            verified: isVerified,
            createdAt: serverTimestamp()
          });
          console.log('   💬 AI comment added');
        }

        // Step 6: Update domain trust scores
        for (const source of reputableSources) {
          await updateTrust(source, isVerified ? 1 : -2);
        }

        if (isVerified) {
          results.verified++;
        } else if (isFlagged) {
          results.flagged++;
        }

        results.corrected++;

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
    console.log('✅ CROSS-VERIFICATION JOB COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${results.processed} | Verified: ${results.verified} | Flagged: ${results.flagged}`);
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
    console.error('❌ [CROSS-VERIFY] Fatal error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}

