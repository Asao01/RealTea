"use client";

import OpenAI from 'openai';

/**
 * AI-powered fact-checking service for event verification
 * Uses OpenAI GPT-4o-mini to analyze event credibility
 */

// Initialize OpenAI client (lazy initialization to prevent errors if key is missing)
let client = null;

function getOpenAIClient() {
  if (!client) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    });
  }
  return client;
}

// Rate limiting state
const rateLimitState = {
  requests: [],
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 50,
};

/**
 * Check if request is within rate limits
 */
function checkRateLimit() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  // Clean old requests
  rateLimitState.requests = rateLimitState.requests.filter(
    (timestamp) => timestamp > oneHourAgo
  );

  // Check minute limit
  const requestsInLastMinute = rateLimitState.requests.filter(
    (timestamp) => timestamp > oneMinuteAgo
  ).length;

  // Check hour limit
  const requestsInLastHour = rateLimitState.requests.length;

  if (requestsInLastMinute >= rateLimitState.maxRequestsPerMinute) {
    throw new Error(
      `Rate limit exceeded: Maximum ${rateLimitState.maxRequestsPerMinute} requests per minute`
    );
  }

  if (requestsInLastHour >= rateLimitState.maxRequestsPerHour) {
    throw new Error(
      `Rate limit exceeded: Maximum ${rateLimitState.maxRequestsPerHour} requests per hour`
    );
  }

  // Record this request
  rateLimitState.requests.push(now);
}

/**
 * Fact-check an event using OpenAI
 * @param {Object} eventData - Event data to fact-check
 * @param {string} eventData.title - Event title
 * @param {string} eventData.date - Event date
 * @param {string} eventData.description - Event description
 * @param {string} eventData.verifiedSource - User-provided source URL
 * @param {string} eventData.category - Event category
 * @returns {Promise<Object>} - Fact-check results
 */
export async function factCheckEvent(eventData) {
  const { title, date, description, verifiedSource, category } = eventData;

  // Check rate limits first
  try {
    checkRateLimit();
  } catch (rateLimitError) {
    console.warn("Rate limit exceeded:", rateLimitError.message);
    return {
      credibilityScore: null,
      verifiedSummary: null,
      aiSources: [],
      factCheckStatus: "failed",
      factCheckError: rateLimitError.message,
    };
  }

  // Check if API key is configured
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key not configured. Skipping fact-check.");
    return {
      credibilityScore: null,
      verifiedSummary: null,
      aiSources: [],
      factCheckStatus: "skipped",
      factCheckError: "API key not configured",
    };
  }

  // Construct the prompt
  const prompt = `You are a factual verification assistant.

Given the following event, check if it actually occurred using your knowledge and provide:
1. A credibility score (1-100) where:
   - 90-100: Highly verified, well-documented historical event
   - 70-89: Likely accurate, supported by credible sources
   - 40-69: Uncertain, needs more verification
   - 1-39: Questionable, lacks credible evidence

2. A short explanation (2-4 sentences) with specific supporting facts.

3. Up to 3 reliable source URLs if possible.

Event Details:
- Title: ${title}
- Date: ${date}
- Category: ${category || "Not specified"}
- User-provided source: ${verifiedSource || "Not specified"}
- Description: ${description || "No description provided"}

Return ONLY valid JSON in this exact format:
{
  "credibilityScore": 85,
  "verifiedSummary": "Your explanation here",
  "aiSources": ["url1", "url2", "url3"]
}`;

  try {
    // Get OpenAI client (lazy initialization)
    const openai = getOpenAIClient();
    
    // Call OpenAI API using chat completions
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Correct model name
      messages: [
        {
          role: "system",
          content: "You are a fact-checking expert. Analyze events for credibility and provide structured JSON responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for consistency
      max_tokens: 500,
      response_format: { type: "json_object" }, // Ensures JSON response
    });

    const text = response.choices[0]?.message?.content;

    if (!text) {
      throw new Error("No response from AI");
    }

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse AI response:", text);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate and normalize the response
    const credibilityScore = Math.max(
      1,
      Math.min(100, parseInt(parsedResponse.credibilityScore) || 50)
    );
    const verifiedSummary = parsedResponse.explanation || "No explanation provided";
    const aiSources = Array.isArray(parsedResponse.sources)
      ? parsedResponse.sources.filter((s) => typeof s === "string" && s.trim())
      : [];

    return {
      credibilityScore,
      verifiedSummary,
      aiSources,
      factCheckStatus: "completed",
      factCheckedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Fact-check error:", error);

    // Return graceful degradation
    return {
      credibilityScore: null,
      verifiedSummary: null,
      aiSources: [],
      factCheckStatus: "failed",
      factCheckError: error.message,
    };
  }
}

/**
 * Get verification badge based on credibility score
 * @param {number|null} score - Credibility score (1-100)
 * @returns {Object} - Badge configuration
 */
export function getVerificationBadge(score) {
  if (score === null || score === undefined) {
    return {
      icon: "⚪",
      text: "Not Verified",
      color: "gray",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      borderColor: "border-gray-300 dark:border-gray-700",
      textColor: "text-gray-600 dark:text-gray-400",
    };
  }

  if (score > 70) {
    return {
      icon: "✅",
      text: `Verified by AI (${score}%)`,
      color: "gold",
      bgColor: "bg-gold-primary/10",
      borderColor: "border-gold-primary/30",
      textColor: "text-gold-primary",
    };
  }

  if (score >= 40) {
    return {
      icon: "⚠️",
      text: `Needs Review (${score}%)`,
      color: "yellow",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      textColor: "text-yellow-600 dark:text-yellow-500",
    };
  }

  return {
    icon: "❌",
    text: `Unverified (${score}%)`,
    color: "red",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-600 dark:text-red-500",
  };
}

