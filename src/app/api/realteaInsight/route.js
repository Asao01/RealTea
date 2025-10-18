/**
 * RealTea Insight - Deep Geopolitical Bias & Perspective Analysis
 * 
 * Analyzes WHY stories differ across global regions
 * Provides detailed perspective mapping and bias direction
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, serverTimestamp, query, orderBy, limit, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Retry wrapper for API calls
 */
async function withRetry(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}

/**
 * Analyze event insight using OpenAI
 */
async function analyzeEventInsight(event, openai) {
  const prompt = `You are RealTea Insight — a geopolitical AI analyst trained to detect bias, tone, and factual strength in world events.

Analyze the following event based on its text and sources:

TITLE: ${event.title}
DESCRIPTION: ${event.longDescription || event.description || 'Limited information'}
DATE: ${event.date || 'Unknown'}
LOCATION: ${event.location || 'Unknown'}
CATEGORY: ${event.category || 'Unknown'}
SOURCES: ${(event.sources || []).join(', ') || 'None'}
CURRENT CREDIBILITY: ${event.credibilityScore || 70}/100

Return a JSON report analyzing:

1. **biasDirection**: Determine primary perspective:
   - "Pro-West" if dominated by U.S./NATO/EU-aligned outlets
   - "Pro-East" if dominated by Russian/Chinese/Iranian-aligned outlets
   - "Global South" if Africa/Latin America/non-aligned sources dominate
   - "Neutral" if evenly balanced or from international orgs (UN, WHO, Reuters)
   - "Mixed" if multiple conflicting tones or agendas exist

2. **biasConfidence**: How confident are you in this assessment (0-100)

3. **tone**: Classify reporting style:
   - "Objective" - purely factual
   - "Emotional" - contains emotional language
   - "Nationalistic" - serves national interests
   - "Propagandistic" - manipulative/misleading
   - "Sensational" - exaggerated for clicks
   - "Calm" - measured and professional
   - "Analytical" - deep analysis and context

4. **toneConfidence**: How confident (0-100)

5. **reliabilityLevel**: Overall factual reliability
   - "High" if 3+ reputable sources, facts verifiable, no contradictions
   - "Medium" if 1-2 sources, mostly factual but some gaps
   - "Low" if unverified, contradictions, or single partisan source

6. **reliabilityConfidence**: How confident (0-100)

7. **summaryNotes**: A paragraph explaining:
   - What perspectives are most visible
   - How reporting differs between regions
   - Key narrative differences
   - Why certain viewpoints dominate

8. **balancedPerspectiveScore**: How balanced is the coverage (0-100)
   - 0-30: Heavily one-sided
   - 31-60: Moderate balance, some bias
   - 61-85: Well-balanced, multiple perspectives
   - 86-100: Exceptionally balanced, global coverage

9. **overallScore**: Combined assessment (0-100) based on:
   - Factual reliability (40%)
   - Perspective balance (30%)
   - Neutral tone (20%)
   - Source diversity (10%)

Return ONLY valid JSON (no markdown, no code fences):
{
  "biasDirection": "Pro-West|Pro-East|Global South|Neutral|Mixed",
  "biasConfidence": 0-100,
  "tone": "Objective|Emotional|Nationalistic|Propagandistic|Sensational|Calm|Analytical",
  "toneConfidence": 0-100,
  "reliabilityLevel": "High|Medium|Low",
  "reliabilityConfidence": 0-100,
  "summaryNotes": "paragraph",
  "balancedPerspectiveScore": 0-100,
  "overallScore": 0-100
}`;

  return await withRetry(async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a geopolitical media analyst expert in detecting bias patterns, regional framing, and perspective balance. Be objective and evidence-based."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  }, 3);
}

/**
 * Main RealTea Insight Function
 */
export async function GET(request) {
  try {
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('🧠 REALTEA INSIGHT - GEOPOLITICAL ANALYSIS ENGINE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();
    const results = {
      processed: 0,
      analyzed: 0,
      skipped: 0,
      errors: 0
    };

    // Validate
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not configured'
      }, { status: 500 });
    }

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Firestore not initialized'
      }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Fetch recent or unanalyzed events
    console.log('📡 [INSIGHT] Fetching events for analysis...');
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    
    const snapshot = await getDocs(eventsQuery);

    if (snapshot.empty) {
      console.log('✅ [INSIGHT] No events to analyze');
      return NextResponse.json({
        success: true,
        message: 'No events to analyze',
        results
      });
    }

    console.log(`📊 [INSIGHT] Found ${snapshot.size} events`);
    console.log('');

    // Process each event
    for (const eventDoc of snapshot.docs) {
      try {
        results.processed++;
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        console.log(`\n🔍 [${results.processed}/${snapshot.size}] ${eventData.title?.substring(0, 60)}...`);

        // Check if already analyzed recently (within 9 hours)
        const insightRef = doc(db, 'eventInsights', eventId);
        const insightSnap = await getDoc(insightRef);
        
        if (insightSnap.exists()) {
          const lastAnalyzed = insightSnap.data().createdAt?.toDate?.() || new Date(0);
          const hoursSince = (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60);
          
          if (hoursSince < 9) {
            console.log(`   ⏭️  Recently analyzed ${hoursSince.toFixed(1)}h ago`);
            results.skipped++;
            continue;
          }
        }

        // Perform insight analysis
        console.log('   🤖 Running geopolitical analysis...');
        
        let insight;
        try {
          insight = await analyzeEventInsight(eventData, openai);
          console.log(`      ✅ Analysis: ${insight.biasDirection} | ${insight.tone} | ${insight.reliabilityLevel}`);
        } catch (error) {
          console.log(`      ❌ Analysis failed after retries: ${error.message}`);
          results.errors++;
          continue;
        }

        // Validate and normalize scores
        const normalizedInsight = {
          eventId: eventId,
          biasDirection: insight.biasDirection || 'Unknown',
          biasConfidence: Math.max(0, Math.min(100, parseInt(insight.biasConfidence) || 0)),
          tone: insight.tone || 'Unknown',
          toneConfidence: Math.max(0, Math.min(100, parseInt(insight.toneConfidence) || 0)),
          reliabilityLevel: insight.reliabilityLevel || 'Medium',
          reliabilityConfidence: Math.max(0, Math.min(100, parseInt(insight.reliabilityConfidence) || 0)),
          summaryNotes: insight.summaryNotes || '',
          balancedPerspectiveScore: Math.max(0, Math.min(100, parseInt(insight.balancedPerspectiveScore) || 50)),
          overallScore: Math.max(0, Math.min(100, parseInt(insight.overallScore) || 50)),
          createdAt: serverTimestamp(),
          analyzedBy: 'RealTea Insight AI'
        };

        // Save to eventInsights collection
        await setDoc(insightRef, normalizedInsight);
        
        console.log(`      💾 Saved to eventInsights collection`);
        console.log(`      📊 Scores: Overall ${normalizedInsight.overallScore}, Balance ${normalizedInsight.balancedPerspectiveScore}`);

        // Auto-flag if reliability drops below 50
        if (normalizedInsight.reliabilityConfidence < 50) {
          const eventRef = doc(db, 'events', eventId);
          await updateDoc(eventRef, {
            flagged: true,
            flagReason: 'Low reliability detected by AI Insight',
            lastFlagged: serverTimestamp()
          });
          console.log(`      🚩 Auto-flagged: reliability confidence ${normalizedInsight.reliabilityConfidence}%`);
        }

        results.analyzed++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ REALTEA INSIGHT - ANALYSIS COMPLETE');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${results.processed} | Analyzed: ${results.analyzed} | Skipped: ${results.skipped} | Errors: ${results.errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      message: 'RealTea Insight analysis completed',
      results: {
        ...results,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [INSIGHT] Fatal error:', error);
    
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

