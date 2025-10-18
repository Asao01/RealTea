/**
 * Enhanced Event Enrichment API
 * Writes full-page context for events using GPT-4
 * Generates comprehensive analysis including:
 * - Extended description (500-1000 words)
 * - Historical context
 * - Global implications
 * - Multiple perspectives
 * - Source verification
 * - Credibility analysis
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, query, where, limit, getDocs, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes for GPT-4 processing

/**
 * Generate comprehensive context using GPT-4
 */
async function generateFullContext(event) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log(`🤖 [ENRICH] Generating full context for: ${event.title?.substring(0, 60)}...`);

  const prompt = `You are an expert journalist and historian. Write a comprehensive, well-researched analysis of this event.

EVENT DETAILS:
Title: ${event.title || 'Unknown'}
Date: ${event.date || 'Unknown'}
Location: ${event.location || 'Unknown'}
Category: ${event.category || 'Unknown'}
Current Description: ${event.description || 'No description'}
Source: ${event.verifiedSource || event.url || 'Unknown'}

TASK: Write a comprehensive 800-1000 word analysis covering:

1. **Executive Summary** (2-3 sentences)
   - Key facts and immediate implications

2. **Detailed Analysis** (400-500 words)
   - What happened and why it matters
   - Who is involved and their roles
   - Timeline of key developments
   - Immediate consequences

3. **Historical Context** (150-200 words)
   - Similar past events
   - How this fits into broader patterns
   - Long-term historical significance

4. **Global Implications** (100-150 words)
   - Economic impact
   - Political ramifications
   - Social effects
   - Environmental considerations (if relevant)

5. **Multiple Perspectives** (100-150 words)
   - Different viewpoints on the event
   - Potential biases in reporting
   - Conflicting narratives if any

6. **Credibility Assessment** (50-100 words)
   - Source reliability
   - Verification status
   - Confidence level in reported facts
   - Areas of uncertainty

IMPORTANT:
- Be factual and neutral
- Cite specific details when possible
- Acknowledge uncertainties
- Use clear, accessible language
- Maintain journalistic standards
- No speculation beyond reasonable inference

Format your response as a structured article with clear sections.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert journalist and historian who writes comprehensive, well-researched analyses. Maintain objectivity and cite specific details.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000 // Allow for ~1000 word response
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const fullContext = data.choices[0]?.message?.content;

    if (!fullContext) {
      throw new Error('No content generated from OpenAI');
    }

    console.log(`✅ [ENRICH] Generated ${fullContext.length} characters of context`);

    return fullContext;

  } catch (error) {
    console.error('❌ [ENRICH] OpenAI error:', error);
    throw error;
  }
}

/**
 * Calculate enhanced credibility score
 */
function calculateEnhancedCredibility(event, fullContext) {
  let score = 50; // Base score

  // Source verification
  if (event.verifiedSource) score += 15;
  if (event.sources && event.sources.length > 1) score += 10;
  if (event.sources && event.sources.length > 2) score += 5;

  // Content quality
  if (event.description && event.description.length > 200) score += 5;
  if (fullContext && fullContext.length > 500) score += 10;

  // Metadata completeness
  if (event.location) score += 5;
  if (event.date) score += 5;
  if (event.category) score += 3;
  if (event.imageUrl) score += 2;

  // Historical events tend to be more credible
  if (event.date) {
    const year = parseInt(event.date.split('-')[0]);
    if (year < new Date().getFullYear()) score += 10;
  }

  // Verification status
  if (event.verified) score += 10;
  if (event.aiAnalyzed) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Main handler
 */
export async function GET(request) {
  const startTime = Date.now();
  let processed = 0;
  let enriched = 0;
  let errors = 0;

  try {
    console.log('📝 [ENRICH] Starting full event enrichment...');

    if (!db) {
      throw new Error('Firestore not initialized');
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const maxEvents = parseInt(searchParams.get('limit') || '5');

    let eventsToEnrich = [];

    if (eventId) {
      // Enrich specific event
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        eventsToEnrich = [{ id: docSnap.id, ...docSnap.data() }];
      } else {
        throw new Error(`Event ${eventId} not found`);
      }
    } else {
      // Enrich events that need full context
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(
        eventsRef,
        where('enriched', '==', false),
        limit(maxEvents)
      );

      const snapshot = await getDocs(eventsQuery);
      eventsToEnrich = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    console.log(`📊 [ENRICH] Found ${eventsToEnrich.length} events to enrich`);

    // Process each event
    for (const event of eventsToEnrich) {
      try {
        processed++;
        console.log(`\n📝 [ENRICH] Processing ${processed}/${eventsToEnrich.length}: ${event.title?.substring(0, 50)}...`);

        // Generate full context
        const fullContext = await generateFullContext(event);

        // Calculate enhanced credibility
        const credibilityScore = calculateEnhancedCredibility(event, fullContext);

        // Update Firestore
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          longDescription: fullContext,
          credibilityScore: credibilityScore,
          enriched: true,
          enrichedAt: serverTimestamp(),
          enrichedBy: 'GPT-4',
          aiAnalyzed: true,
          lastUpdated: serverTimestamp()
        });

        enriched++;
        console.log(`  ✅ Enriched with ${fullContext.length} chars, credibility: ${credibilityScore}`);

        // Rate limiting - wait 2 seconds between API calls
        if (processed < eventsToEnrich.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`  ❌ Error enriching event ${event.id}:`, error.message);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ EVENT ENRICHMENT COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Processed: ${processed}`);
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      processed,
      enriched,
      errors,
      durationSeconds: parseFloat(duration)
    });

  } catch (error) {
    console.error('❌ [ENRICH] Fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      processed,
      enriched,
      errors: errors + 1,
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

// Support POST
export async function POST(request) {
  return GET(request);
}

