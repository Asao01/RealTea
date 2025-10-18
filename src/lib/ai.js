/**
 * OpenAI Integration for News Summarization
 */

import { calculateUrgencyScore, isBreakingHeuristic } from './breakingHeuristic';

/**
 * Summarize news article and extract event data using OpenAI
 * @param {Object} article - Normalized article
 * @returns {Promise<Object>} Event data with urgency
 */
export async function summarizeAndExtractEvent(article, customPrompt = null) {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log(`🤖 [OpenAI] Processing: "${article.title.substring(0, 50)}..."`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a news analyst. Extract key event data from news articles. Be factual, neutral, and concise. Respond ONLY with valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Analyze this news article and extract event data:

Title: ${article.title}
Description: ${article.description}
Content: ${article.content.substring(0, 400)}

Return ONLY valid JSON (no markdown):
{
  "title": "Concise event title (max 100 chars)",
  "description": "Factual summary in 2-3 sentences (150-300 chars)",
  "category": "exactly one of: World, Politics, Science, Tech, Environment, Conflict, Economy",
  "location": "Primary location (City, Country) or 'Global' or 'Multiple Locations'",
  "urgency": number 0-100 (impact/importance: 0=minor, 50=significant, 85+=critical/breaking),
  "isBreaking": true only if extremely urgent/critical (war, disaster, major crisis)
}

Be accurate and neutral.`
          }
        ],
        temperature: 0.5,
        max_tokens: 350
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content from OpenAI');
    }

    // Clean and parse JSON
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const extracted = JSON.parse(cleanContent);

    // Validate required fields
    if (!extracted.title || !extracted.description || !extracted.category) {
      throw new Error('Missing required fields from AI');
    }

    // Calculate heuristic urgency if AI urgency seems off
    const heuristicUrgency = calculateUrgencyScore(article.title, article.description);
    const heuristicBreaking = isBreakingHeuristic(article.title, article.description);
    
    // Combine AI and heuristic analysis
    const finalUrgency = Math.max(extracted.urgency || 0, heuristicUrgency);
    const finalBreaking = extracted.isBreaking || heuristicBreaking || finalUrgency >= 85;

    console.log(`✅ [OpenAI] Extracted: urgency=${finalUrgency}, breaking=${finalBreaking}`);

    return {
      title: extracted.title,
      description: extracted.description,
      category: extracted.category,
      location: extracted.location || 'Unknown',
      urgency: finalUrgency,
      isBreaking: finalBreaking
    };
  } catch (error) {
    console.error(`❌ [OpenAI] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Retry wrapper for API calls
 */
export async function withRetry(fn, maxRetries = 2) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Retry ${i + 1}/${maxRetries} after error: ${error.message}`);
      
      if (i < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

