/**
 * RealTea AI - Prompt Templates and AI Utilities
 * Standardized prompts for enrichment and verification
 */

export const REALTEA_ENRICH_PROMPT = (eventData) => `You are RealTea, a professional historian and investigative journalist.

Expand this event into a comprehensive, well-researched article of exactly 600-1000 words (4-6 paragraphs):

Title: ${eventData.title}
Current Summary: ${eventData.longDescription || eventData.description || 'Limited information'}
Date: ${eventData.date || 'Unknown'}
Location: ${eventData.location || 'Unknown'}
Category: ${eventData.category || 'Unknown'}
Existing Sources: ${(eventData.sources || []).join(', ') || 'None provided'}

Structure your article as follows:

Paragraph 1 (Opening): What happened and when. Be specific and factual.

Paragraph 2 (Background): Historical context, what led to this event, relevant prior developments.

Paragraph 3 (Key Actors): People, organizations, nations, or entities involved. Their roles and motivations.

Paragraph 4 (Immediate Consequences): What happened immediately after. Direct impacts and reactions.

Paragraph 5 (Broader Implications): Why this matters globally. Long-term significance and connections to larger trends.

Paragraph 6 (Sources & Verification): List 3-6 reputable sources that can verify this information. Include major news organizations, official records, or academic sources.

Requirements:
- Write in clear, accessible English for a general audience
- Avoid jargon; explain technical terms if used
- Be completely neutral - no political bias, no emotional language
- Use specific details, dates, and names
- Cite verifiable facts, not speculation
- Maintain a factual, encyclopedic tone

Return ONLY the article text with paragraphs separated by double line breaks (\\n\\n).
Do NOT include JSON, markdown formatting, or code fences.`;

export const REALTEA_VERIFY_PROMPT = (eventData, corroborationData) => `You are RealTea's Verification AI, an expert fact-checker.

Verify the accuracy of this event by comparing it with corroboration from multiple independent sources:

EVENT TO VERIFY:
Title: ${eventData.title}
Description: ${eventData.longDescription || eventData.description || 'Unknown'}
Date: ${eventData.date || 'Unknown'}
Location: ${eventData.location || 'Unknown'}
Category: ${eventData.category || 'Unknown'}
Current Sources: ${(eventData.sources || []).join(', ') || 'None'}
Current Credibility: ${eventData.credibilityScore || 70}/100

CORROBORATION DATA:
${corroborationData}

Your task:
1. Compare the event's core claims (what, when, where, who) with the corroboration data
2. Identify any inconsistencies, exaggerations, or unsupported claims
3. Assess the reliability of sources mentioned
4. Check for bias, inflammatory language, or editorialization
5. Determine if the event is verified by multiple independent sources

Scoring guidelines:
- 90-100: Verified by 2+ highly reputable sources (Reuters, AP, BBC, NASA, WHO, academic journals)
- 75-89: Verified by 1 reputable source OR 2+ reliable sources (major newspapers)
- 60-74: Single reliable source OR multiple blogs/social media with consistency
- 40-59: Limited corroboration OR conflicting information from different sources
- 0-39: No corroboration OR multiple sources contradict the claims OR tabloid/gossip only

Return ONLY valid JSON (no markdown, no code fences):
{
  "credibilityScore": 0-100,
  "verified": true/false,
  "verificationSummary": "2-3 sentence explanation of your assessment and what sources confirmed or contradicted",
  "corroboratedSources": ["source1", "source2"],
  "concerns": ["any issues found"],
  "recommendations": ["how to improve this entry if applicable"]
}`;

/**
 * Get OpenAI client with error handling
 */
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [AI] OpenAI API key not found in environment variables');
    return null;
  }

  try {
    const OpenAI = require('openai').default;
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error('❌ [AI] Failed to initialize OpenAI:', error);
    return null;
  }
}

/**
 * Enrich event with full article
 */
export async function enrichEvent(eventData) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const prompt = REALTEA_ENRICH_PROMPT(eventData);
    
    console.log(`📝 [AI] Enriching: ${eventData.title?.substring(0, 60)}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a Pulitzer Prize-winning journalist and historian. Write comprehensive, neutral, well-researched articles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.4
    });

    const articleText = completion.choices[0].message.content.trim();
    const wordCount = articleText.split(/\s+/).length;
    
    console.log(`   ✅ Generated: ${articleText.length} chars, ${wordCount} words`);
    
    return {
      longDescription: articleText,
      description: articleText.substring(0, 250) + '...',
      wordCount
    };

  } catch (error) {
    console.error(`❌ [AI] Enrichment failed:`, error.message);
    return null;
  }
}

/**
 * Verify event with AI and corroboration data
 */
export async function verifyEvent(eventData, corroborationData) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const prompt = REALTEA_VERIFY_PROMPT(eventData, corroborationData);
    
    console.log(`🔍 [AI] Verifying: ${eventData.title?.substring(0, 60)}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert fact-checker. Be thorough, fair, and evidence-based."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log(`   ✅ Verification: ${result.verified ? 'VERIFIED' : 'UNVERIFIED'} | Score: ${result.credibilityScore}/100`);
    
    return {
      credibilityScore: Math.max(0, Math.min(100, parseInt(result.credibilityScore) || 70)),
      verified: result.verified || false,
      verificationSummary: result.verificationSummary || '',
      corroboratedSources: result.corroboratedSources || [],
      concerns: result.concerns || [],
      recommendations: result.recommendations || []
    };

  } catch (error) {
    console.error(`❌ [AI] Verification failed:`, error.message);
    return null;
  }
}

/**
 * General AI prompt (alias for backward compatibility)
 */
export const REALTEA_AI_PROMPT = REALTEA_ENRICH_PROMPT;

/**
 * Validate event data (alias for verifyEvent)
 */
export async function validateEvent(eventData, corroborationData) {
  return await verifyEvent(eventData, corroborationData);
}

/**
 * Log AI action for monitoring
 */
export async function logAIAction(action, data) {
  const timestamp = new Date().toISOString();
  console.log(`🤖 [AI ACTION] ${timestamp} - ${action}`, data);
  return { success: true, timestamp, action };
}

export default {
  REALTEA_ENRICH_PROMPT,
  REALTEA_VERIFY_PROMPT,
  REALTEA_AI_PROMPT,
  getOpenAIClient,
  enrichEvent,
  verifyEvent,
  validateEvent,
  logAIAction
};
