/**
 * Advanced AI System for RealTea
 * Enhanced prompts for detailed articles and fact-checking
 */

import { db } from "./firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";

/**
 * Source Trust Ratings
 * Learned from historical accuracy and editorial standards
 */
export const SOURCE_TRUST_WEIGHTS = {
  // Tier 1: Highly Trusted (0.90-1.00)
  "reuters.com": 0.95,
  "apnews.com": 0.94,
  "bbc.com": 0.91,
  "theguardian.com": 0.90,
  
  // Tier 2: Trusted (0.80-0.89)
  "nytimes.com": 0.88,
  "washingtonpost.com": 0.87,
  "aljazeera.com": 0.87,
  "bloomberg.com": 0.86,
  "economist.com": 0.85,
  "npr.org": 0.84,
  "ft.com": 0.83,
  "wsj.com": 0.82,
  
  // Tier 3: Reliable (0.70-0.79)
  "cnn.com": 0.78,
  "nbcnews.com": 0.77,
  "cbsnews.com": 0.76,
  "abcnews.go.com": 0.75,
  "theatlantic.com": 0.74,
  "forbes.com": 0.72,
  "time.com": 0.71,
  
  // Tier 4: Moderate (0.50-0.69)
  "wikipedia.org": 0.65,
  "youtube.com": 0.50,
  
  // Tier 5: Lower Trust (0.30-0.49)
  "twitter.com": 0.40,
  "facebook.com": 0.38,
  "reddit.com": 0.35,
  
  // Default for unknown sources
  "default": 0.60
};

/**
 * Get trust weight for a source URL
 */
export function getSourceTrustWeight(sourceUrl) {
  if (!sourceUrl) return SOURCE_TRUST_WEIGHTS.default;
  
  try {
    const domain = new URL(sourceUrl).hostname.replace('www.', '');
    return SOURCE_TRUST_WEIGHTS[domain] || SOURCE_TRUST_WEIGHTS.default;
  } catch (error) {
    return SOURCE_TRUST_WEIGHTS.default;
  }
}

/**
 * Get OpenAI client
 */
function getOpenAIClient() {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [AI] OpenAI API key not found');
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
 * Generate comprehensive article for an event
 * Returns 500-800 word detailed analysis
 */
export async function generateLongArticle(event) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  const prompt = `You are RealTea, a global factual AI historian.

Write a comprehensive 500-800 word clear, factual, and neutral article explaining this event:

Event Title: ${event.title}
Date: ${event.date || 'Unknown'}
Location: ${event.location || 'Unknown'}
Category: ${event.category || 'Unknown'}
Short Description: ${event.description || 'Unknown'}

Your article should include:
1. Background and historical context
2. Immediate causes and triggers
3. Key people, organizations, or nations involved
4. Sequence of major events
5. Immediate consequences and impact
6. Long-term significance
7. Verified sources and citations

Make it readable and understandable to any audience. Use clear paragraphs.
Focus on facts, not opinions. Be neutral and balanced.

Respond with JSON:
{
  "longDescription": "Your 500-800 word article here",
  "keyFigures": ["Name 1", "Name 2"],
  "timeline": ["Event 1", "Event 2"],
  "impact": "Short summary of consequences",
  "region": "Global/Asia/Europe/Americas/Africa/Middle East/Oceania",
  "importanceScore": 0-100 (historical significance),
  "suggestedSources": ["url1", "url2"]
}`;

  try {
    console.log(`📝 [AI] Generating long article for: ${event.title?.substring(0, 60)}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional historian and journalist. Write comprehensive, factual articles."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log(`✅ [AI] Generated article: ${result.longDescription?.length || 0} characters`);
    
    return result;

  } catch (error) {
    console.error('❌ [AI] Error generating article:', error);
    return null;
  }
}

/**
 * Verify and fact-check an event
 */
export async function verifyEvent(event) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  const checkPrompt = `You are RealTea's Verification AI.

Compare this event with reputable global news archives and historical records:

Title: ${event.title}
Date: ${event.date}
Description: ${event.description || event.longDescription}
Sources: ${event.sources?.join(', ') || 'Unknown'}

Assess:
1. Factual accuracy based on your training data
2. Potential bias or misinformation
3. Missing context or nuance
4. Whether the information remains current and true

Respond with JSON:
{
  "verified": true/false,
  "credibilityScore": 0-100,
  "verificationSummary": "Clear 2-3 sentence explanation of your assessment",
  "reason": "verified / outdated / disputed / false / incomplete",
  "concerns": ["Any issues found"],
  "recommendations": ["How to improve this entry"]
}`;

  try {
    console.log(`🔍 [AI] Fact-checking: ${event.title?.substring(0, 60)}...`);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert fact-checker. Be thorough but fair."
        },
        {
          role: "user",
          content: checkPrompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log(`✅ [AI] Verification: ${result.verified ? 'VERIFIED' : 'FAILED'} | Score: ${result.credibilityScore}`);
    
    return {
      verified: result.verified || false,
      credibilityScore: Math.min(100, Math.max(0, parseInt(result.credibilityScore) || 50)),
      verificationSummary: result.verificationSummary || '',
      reason: result.reason || 'unverified',
      concerns: result.concerns || [],
      recommendations: result.recommendations || [],
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [AI] Error verifying event:', error);
    return null;
  }
}

/**
 * Calculate credibility with source trust weighting
 */
export function calculateCredibilityWithSources(baseScore, sources) {
  if (!sources || sources.length === 0) {
    return baseScore * 0.8; // Penalty for no sources
  }

  // Calculate average trust weight
  const trustWeights = sources.map(url => getSourceTrustWeight(url));
  const avgTrust = trustWeights.reduce((a, b) => a + b, 0) / trustWeights.length;
  
  // Apply weighting
  const adjustedScore = baseScore * avgTrust;
  
  // Bonus for multiple high-quality sources
  const multiSourceBonus = sources.length > 2 ? 5 : 0;
  
  return Math.min(100, adjustedScore + multiSourceBonus);
}

/**
 * Add AI comment to event
 */
export async function addAIComment(eventId, verificationSummary, metadata = {}) {
  try {
    const { collection: firestoreCollection, addDoc } = await import('firebase/firestore');
    
    const aiComment = {
      text: verificationSummary,
      author: "RealTea AI",
      userId: "system-ai",
      isAI: true,
      createdAt: new Date(),
      timestamp: serverTimestamp(),
      ...metadata
    };

    await addDoc(firestoreCollection(db, `events/${eventId}/ai_comments`), aiComment);
    
    console.log(`💬 [AI] Added AI comment to event ${eventId}`);
    return true;
  } catch (error) {
    console.error('❌ [AI] Error adding AI comment:', error);
    return false;
  }
}

/**
 * Update event with enhanced AI analysis
 */
export async function enhanceEventWithAI(eventId) {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      console.error('❌ Event not found:', eventId);
      return false;
    }

    const eventData = { id: eventSnap.id, ...eventSnap.data() };
    
    console.log(`🚀 [AI] Enhancing event: ${eventData.title}`);

    // Generate long article
    const article = await generateLongArticle(eventData);
    
    // Verify event
    const verification = await verifyEvent(eventData);
    
    // Calculate weighted credibility
    const sourceTrust = calculateCredibilityWithSources(
      verification?.credibilityScore || 70,
      eventData.sources || []
    );

    // Update Firestore
    const updates = {
      ...(article && {
        longDescription: article.longDescription,
        keyFigures: article.keyFigures || [],
        timeline: article.timeline || [],
        impact: article.impact || '',
        region: article.region || 'Global',
        importanceScore: article.importanceScore || 50,
      }),
      ...(verification && {
        verified: verification.verified,
        credibilityScore: sourceTrust,
        verificationSummary: verification.verificationSummary,
        verificationReason: verification.reason,
        concerns: verification.concerns,
        lastChecked: serverTimestamp()
      }),
      enhancedAt: serverTimestamp(),
      enhancedBy: 'advanced-ai'
    };

    await updateDoc(eventRef, updates);
    
    // Add AI comment with verification summary
    if (verification?.verificationSummary) {
      await addAIComment(eventId, verification.verificationSummary, {
        credibilityScore: sourceTrust,
        verified: verification.verified,
        reason: verification.reason
      });
    }
    
    console.log(`✅ [AI] Event enhanced successfully`);
    return true;

  } catch (error) {
    console.error('❌ [AI] Error enhancing event:', error);
    return false;
  }
}

export default {
  generateLongArticle,
  verifyEvent,
  getSourceTrustWeight,
  calculateCredibilityWithSources,
  enhanceEventWithAI,
  SOURCE_TRUST_WEIGHTS
};

