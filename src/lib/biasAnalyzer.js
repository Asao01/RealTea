/**
 * Bias Analyzer - Advanced Narrative and Political Alignment Detection
 * Analyzes text for bias, tone, and political alignment
 */

import { getOpenAIClient } from './realteaAI';

/**
 * Analyze text for bias and tone using OpenAI
 * @param {string} text - Text to analyze
 * @param {Array} sources - Array of source names/URLs
 * @returns {Promise<Object>} Bias analysis result
 */
export async function analyzeBias(text, sources = []) {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const prompt = `You are an expert media analyst specializing in bias detection and narrative analysis.

Analyze the following text for bias, tone, and political alignment:

TEXT:
${text.substring(0, 2000)}

SOURCES:
${sources.join(', ') || 'Unknown'}

Evaluate:
1. **Bias Score** (-100 to +100):
   - -100 to -50: State-controlled propaganda, heavy manipulation
   - -49 to -20: Partisan lean, selective facts
   - -19 to +19: Mostly neutral, balanced
   - +20 to +49: Independent with mild editorial stance
   - +50 to +100: Investigative, fact-focused, transparent

2. **Tone Score** (0 to 100):
   - 0-20: Highly emotional, inflammatory
   - 21-40: Persuasive, opinionated
   - 41-60: Measured, some emotion
   - 61-80: Factual, professional
   - 81-100: Clinical, purely factual

3. **Political Alignment**:
   - "Left" if progressive/liberal framing
   - "Right" if conservative/traditional framing
   - "Neutral" if balanced or non-political
   - "State" if government-controlled narrative

4. **Bias Summary**: 2-3 sentence explanation of:
   - What bias indicators you found (if any)
   - How different sources might frame this differently
   - Why you assigned this score

Return ONLY valid JSON (no markdown, no code fences):
{
  "biasScore": -100 to 100,
  "toneScore": 0 to 100,
  "alignment": "Left|Right|Neutral|State",
  "biasSummary": "2-3 sentence explanation"
}`;

    console.log('🎯 [BIAS] Analyzing narrative bias and tone...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert media analyst. Provide objective, evidence-based bias assessments without your own bias."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Validate and clamp scores
    const biasScore = Math.max(-100, Math.min(100, parseInt(result.biasScore) || 0));
    const toneScore = Math.max(0, Math.min(100, parseInt(result.toneScore) || 50));
    const alignment = ['Left', 'Right', 'Neutral', 'State'].includes(result.alignment) 
      ? result.alignment 
      : 'Neutral';

    console.log(`   📊 Bias: ${biasScore}, Tone: ${toneScore}, Alignment: ${alignment}`);

    return {
      biasScore,
      toneScore,
      alignment,
      biasSummary: result.biasSummary || 'Analysis unavailable'
    };

  } catch (error) {
    console.error('❌ [BIAS] Error analyzing bias:', error.message);
    return null;
  }
}

/**
 * Get bias label based on score
 */
export function getBiasLabel(biasScore) {
  if (biasScore <= -50) return '🚨 Propaganda';
  if (biasScore <= -20) return '⚠️ Partisan';
  if (biasScore >= -19 && biasScore <= 19) return '✅ Balanced';
  if (biasScore >= 20 && biasScore <= 49) return '📰 Editorial';
  if (biasScore >= 50) return '🔍 Investigative';
  return '❓ Unknown';
}

/**
 * Get tone label based on score
 */
export function getToneLabel(toneScore) {
  if (toneScore <= 20) return '🔥 Inflammatory';
  if (toneScore <= 40) return '📢 Persuasive';
  if (toneScore <= 60) return '📝 Measured';
  if (toneScore <= 80) return '📊 Factual';
  if (toneScore <= 100) return '🔬 Clinical';
  return '❓ Unknown';
}

/**
 * Get alignment emoji
 */
export function getAlignmentEmoji(alignment) {
  switch (alignment) {
    case 'Left': return '⬅️';
    case 'Right': return '➡️';
    case 'Neutral': return '⚖️';
    case 'State': return '🏛️';
    default: return '❓';
  }
}

export default {
  analyzeBias,
  getBiasLabel,
  getToneLabel,
  getAlignmentEmoji
};

