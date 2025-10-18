/**
 * Autonomous AI Moderator
 * 24/7 news verification and event generation system
 */

import { NextResponse } from "next/server";
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { REALTEA_AI_PROMPT, validateEvent, logAIAction, isSourceTrusted, isSourceRejected } from "@/lib/realteaAI";
import { generateLongArticle, verifyEvent, calculateCredibilityWithSources } from "@/lib/advancedAI";
import { generateUrlHash } from "@/lib/hash";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Get OpenAI client
 */
function getOpenAIClient() {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [AI-MOD] OpenAI API key not found');
    return null;
  }

  try {
    const OpenAI = require('openai').default;
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error('❌ [AI-MOD] Failed to initialize OpenAI:', error);
    return null;
  }
}

/**
 * Autonomous AI Moderator - Main Function
 */
export async function GET(request) {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🤖 REALTEA AI MODERATOR - STARTING AUTONOMOUS RUN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();
    const results = {
      fetched: 0,
      verified: 0,
      rejected: 0,
      saved: 0,
      updated: 0,
      errors: 0
    };

    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI not configured'
      }, { status: 500 });
    }

    // Step 1: Fetch latest news (simulated - replace with real NEWS_API_KEY fetch)
    console.log('📰 [AI-MOD] Fetching latest global news...');
    
    const newsPrompt = `${REALTEA_AI_PROMPT}

Generate 5 of the most important verified global news events from the past 24 hours.

Focus on:
- Major political developments
- Scientific breakthroughs
- Natural disasters or pandemics
- Wars or conflicts
- Economic shifts
- Technological innovations
- Human rights events

For each event, provide complete verified information in the exact JSON format specified.
Ensure each has 500-800 word longDescription, 2+ sources, and credibility ≥ 70.

Return as JSON array of events.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are RealTea AI, a factual news verification system. Always return valid JSON."
        },
        {
          role: "user",
          content: newsPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const responseData = JSON.parse(completion.choices[0].message.content);
    const events = responseData.events || [];
    
    results.fetched = events.length;
    console.log(`✅ [AI-MOD] AI generated ${events.length} events`);

    // Step 2: Validate and process each event
    for (const event of events) {
      try {
        console.log(`🔍 [AI-MOD] Processing: ${event.title?.substring(0, 60)}...`);

        // Validate event quality
        const validation = validateEvent(event);
        
        if (!validation.valid) {
          console.log(`❌ [AI-MOD] Rejected: ${validation.errors.join(', ')}`);
          results.rejected++;
          
          await logAIAction('event_rejected', {
            title: event.title,
            reasons: validation.errors
          });
          continue;
        }

        results.verified++;

        // Generate urlHash for deduplication
        const urlHash = await generateUrlHash(
          event.verifiedSource || event.sources?.[0] || event.title,
          event.title,
          event.date
        );

        // Check for duplicates
        const eventsRef = collection(db, 'events');
        const duplicateQuery = query(eventsRef, where('urlHash', '==', urlHash));
        const duplicates = await getDocs(duplicateQuery);

        if (!duplicates.empty) {
          console.log(`⏭️ [AI-MOD] Duplicate found, updating: ${event.title.substring(0, 60)}...`);
          
          const existingDoc = duplicates.docs[0];
          await setDoc(doc(db, 'events', existingDoc.id), {
            ...event,
            urlHash,
            updatedAt: serverTimestamp(),
            lastVerifiedBy: 'realtea-ai',
            lastVerifiedAt: serverTimestamp()
          }, { merge: true });
          
          results.updated++;
          
          await logAIAction('event_updated', {
            id: existingDoc.id,
            title: event.title
          });
          
          continue;
        }

        // Save new event
        const eventData = {
          ...event,
          urlHash,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          addedBy: 'realtea-ai',
          verifiedBy: 'realtea-ai',
          verifiedAt: serverTimestamp(),
          aiGenerated: true,
          autoModerated: true
        };

        await addDoc(eventsRef, eventData);
        results.saved++;
        
        console.log(`✅ [AI-MOD] Saved: ${event.title.substring(0, 60)}... (Score: ${event.credibilityScore})`);
        
        await logAIAction('event_created', {
          title: event.title,
          credibility: event.credibilityScore,
          importance: event.importanceScore
        });

        // Rate limiting between saves
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ [AI-MOD] Error processing event:`, error);
        results.errors++;
        
        await logAIAction('event_error', {
          title: event.title,
          error: error.message
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ AI MODERATOR RUN COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Fetched: ${results.fetched} | Verified: ${results.verified} | Rejected: ${results.rejected}`);
    console.log(`💾 Saved: ${results.saved} | Updated: ${results.updated} | Errors: ${results.errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Log completion
    await logAIAction('moderator_run_complete', {
      ...results,
      durationSeconds: parseFloat(duration)
    });

    return NextResponse.json({
      success: true,
      message: 'Autonomous AI moderator run completed',
      results,
      timestamp: new Date().toISOString(),
      durationSeconds: parseFloat(duration)
    });

  } catch (error) {
    console.error('❌ [AI-MOD] Fatal error:', error);
    
    await logAIAction('moderator_error', {
      error: error.message,
      stack: error.stack
    });
    
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

