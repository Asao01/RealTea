/**
 * AI Analysis Utilities
 * Provides AI-powered event analysis, credibility scoring, and bias detection
 */

import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * Initialize OpenAI client (lazy loaded)
 */
function getOpenAIClient() {
  // Only import OpenAI if we have an API key
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [AI] OpenAI API key not found');
    return null;
  }

  try {
    const OpenAI = require('openai').default;
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error('❌ [AI] Failed to initialize OpenAI client:', error);
    return null;
  }
}

/**
 * Analyze event using AI
 * Returns: { summary, credibility, bias, sources }
 */
export async function analyzeEvent(event) {
  const openai = getOpenAIClient();
  
  if (!openai) {
    console.warn('⚠️ [AI] Skipping analysis - OpenAI not available');
    return null;
  }

  const prompt = `You are an expert fact-checker and historian. Analyze this event and provide a comprehensive assessment.

Event Data:
- Title: ${event.title || 'Unknown'}
- Description: ${event.description || 'No description'}
- Date: ${event.date || 'Unknown'}
- Category: ${event.category || 'Unknown'}
- Location: ${event.location || 'Unknown'}
- Source: ${event.verifiedSource || event.source?.url || 'Unknown'}

Provide your analysis in JSON format with these fields:

1. **summary**: A single factual sentence (max 35 words) that captures the essence of this event.

2. **credibility**: A score from 0-100 based on:
   - Historical accuracy and verification (40 points)
   - Source reliability and citations (30 points)
   - Factual consistency and logic (20 points)
   - Lack of sensationalism or bias (10 points)

3. **bias**: Detect editorial bias and classify as one of:
   - "neutral" (factual, balanced reporting)
   - "left-leaning" (progressive editorial slant)
   - "right-leaning" (conservative editorial slant)
   - "state-controlled" (government propaganda)
   - "conspiracy" (unverified conspiracy theories)
   - "sensational" (clickbait or exaggerated)
   - "unknown" (insufficient information)

4. **reasoning**: Brief explanation (1-2 sentences) for the credibility score.

5. **factCheckStatus**: One of: "verified", "unverified", "disputed", "false"

Respond ONLY with valid JSON. No markdown, no extra text.`;

  try {
    console.log(`🤖 [AI] Analyzing event: ${event.title?.substring(0, 60)}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise fact-checker. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const result = JSON.parse(content);
    
    console.log(`✅ [AI] Analysis complete:`, {
      credibility: result.credibility,
      bias: result.bias,
      status: result.factCheckStatus
    });

    return {
      summary: result.summary || event.description?.substring(0, 150),
      credibility: Math.min(100, Math.max(0, parseInt(result.credibility) || 70)),
      bias: result.bias || 'unknown',
      reasoning: result.reasoning || '',
      factCheckStatus: result.factCheckStatus || 'unverified',
      analyzedAt: new Date().toISOString(),
      analyzedBy: 'gpt-4o-mini'
    };

  } catch (error) {
    console.error('❌ [AI] Analysis failed:', error.message);
    
    // Return fallback analysis
    return {
      summary: event.description?.substring(0, 150) || event.title,
      credibility: 70, // Neutral default
      bias: 'unknown',
      reasoning: 'Automated analysis unavailable',
      factCheckStatus: 'unverified',
      analyzedAt: new Date().toISOString(),
      analyzedBy: 'fallback'
    };
  }
}

/**
 * Verify event against multiple sources using AI
 */
export async function verifyEventWithSources(event) {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return { verified: false, sources: [], confidence: 0 };
  }

  const prompt = `Search your knowledge base for information about this historical event:

Event: "${event.title}"
Date: ${event.date}
Location: ${event.location}

Based on your training data, provide:
1. **verified**: true/false - Does this event match historical records?
2. **confidence**: 0-100 - How confident are you in this verification?
3. **knownSources**: List 2-3 reliable sources that document this event (e.g., "Wikipedia", "Encyclopedia Britannica", "Historical Archives")
4. **discrepancies**: Any inconsistencies found (or "none")

Respond with JSON only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    return {
      verified: result.verified || false,
      confidence: parseInt(result.confidence) || 0,
      sources: result.knownSources || [],
      discrepancies: result.discrepancies || 'none',
      verifiedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [AI] Source verification failed:', error);
    return { verified: false, sources: [], confidence: 0 };
  }
}

/**
 * Update event in Firestore with AI analysis
 */
export async function updateEventAnalysis(eventId, analysis) {
  try {
    const ref = doc(db, "events", eventId);
    
    await updateDoc(ref, {
      aiSummary: analysis.summary,
      credibilityScore: analysis.credibility,
      biasLabel: analysis.bias,
      credibilityReasoning: analysis.reasoning,
      factCheckStatus: analysis.factCheckStatus,
      analyzedAt: serverTimestamp(),
      analyzedBy: analysis.analyzedBy || 'ai',
      lastUpdated: serverTimestamp()
    });

    console.log(`✅ [AI] Updated event ${eventId} with analysis`);
    return true;

  } catch (error) {
    console.error(`❌ [AI] Failed to update event ${eventId}:`, error);
    return false;
  }
}

/**
 * Batch analyze multiple events
 */
export async function batchAnalyzeEvents(events, options = {}) {
  const { maxConcurrent = 3, delayMs = 1000 } = options;
  
  const results = {
    total: events.length,
    analyzed: 0,
    failed: 0,
    skipped: 0
  };

  console.log(`🤖 [AI] Starting batch analysis of ${events.length} events...`);

  // Process in batches to avoid rate limits
  for (let i = 0; i < events.length; i += maxConcurrent) {
    const batch = events.slice(i, i + maxConcurrent);
    
    const promises = batch.map(async (event) => {
      // Skip if already analyzed recently (within 30 days)
      if (event.analyzedAt) {
        const analyzedDate = new Date(event.analyzedAt);
        const daysSince = (Date.now() - analyzedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince < 30) {
          console.log(`⏭️ [AI] Skipping recently analyzed: ${event.title?.substring(0, 50)}...`);
          results.skipped++;
          return;
        }
      }

      try {
        const analysis = await analyzeEvent(event);
        
        if (analysis && event.id) {
          await updateEventAnalysis(event.id, analysis);
          results.analyzed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`❌ [AI] Error analyzing ${event.id}:`, error);
        results.failed++;
      }
    });

    await Promise.all(promises);
    
    // Delay between batches
    if (i + maxConcurrent < events.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log(`✅ [AI] Batch analysis complete:`, results);
  return results;
}

/**
 * Calculate credibility score manually (fallback)
 */
export function calculateCredibilityScore(event) {
  let score = 50; // Base score

  // Has verified source
  if (event.verifiedSource) score += 20;
  
  // Has multiple sources
  if (event.sources && event.sources.length > 1) score += 10;
  
  // Has location coordinates
  if (event.lat && event.lng) score += 5;
  
  // Has image
  if (event.imageUrl) score += 5;
  
  // Has detailed description
  if (event.description && event.description.length > 100) score += 10;
  
  // Historical event (older = more likely to be verified)
  if (event.date) {
    const year = parseInt(event.date.split('-')[0]);
    if (year < 2000) score += 5;
  }

  // Limit to 0-100
  return Math.min(100, Math.max(0, score));
}

export default {
  analyzeEvent,
  verifyEventWithSources,
  updateEventAnalysis,
  batchAnalyzeEvents,
  calculateCredibilityScore
};

