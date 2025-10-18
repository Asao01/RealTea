/**
 * API Route: /api/factCheck
 * POST endpoint that accepts an event description and returns fact-checked results
 * Verifies claims across multiple news APIs and calculates credibility score
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

/**
 * Calculate credibility score based on multiple factors
 */
function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1; // older than 7 days lowers score
  return parseFloat(((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2));
}

/**
 * Search NewsAPI for related articles
 */
async function searchNewsAPI(query) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ [FACTCHECK] NewsAPI key not configured');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&pageSize=10&sortBy=relevancy&apiKey=${apiKey}`;
    
    const response = await fetch(url, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    
    if (!response.ok) {
      console.warn(`⚠️ [FACTCHECK] NewsAPI returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const articles = (data.articles || []).slice(0, 5);
    
    console.log(`✅ [FACTCHECK] NewsAPI: Found ${articles.length} articles`);
    
    return articles.map(article => ({
      source: 'NewsAPI',
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
      description: article.description,
      sourceName: article.source?.name || 'Unknown'
    }));
  } catch (error) {
    console.error('❌ [FACTCHECK] NewsAPI error:', error.message);
    return [];
  }
}

/**
 * Search GDELT for related articles
 */
async function searchGDELT(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=10&format=json&sort=datedesc`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'RealTea-FactCheck/1.0' }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ [FACTCHECK] GDELT returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const articles = (data.articles || []).slice(0, 5);
    
    console.log(`✅ [FACTCHECK] GDELT: Found ${articles.length} articles`);
    
    return articles.map(article => ({
      source: 'GDELT',
      title: article.title,
      url: article.url,
      publishedAt: article.seendate,
      description: article.title,
      sourceName: article.domain || 'Unknown'
    }));
  } catch (error) {
    console.error('❌ [FACTCHECK] GDELT error:', error.message);
    return [];
  }
}

/**
 * Search Mediastack for related articles (optional)
 */
async function searchMediastack(query) {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  if (!apiKey) {
    console.log('ℹ️ [FACTCHECK] Mediastack API key not configured (optional)');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=${encodedQuery}&limit=10&sort=published_desc`;
    
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.warn(`⚠️ [FACTCHECK] Mediastack returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const articles = (data.data || []).slice(0, 5);
    
    console.log(`✅ [FACTCHECK] Mediastack: Found ${articles.length} articles`);
    
    return articles.map(article => ({
      source: 'Mediastack',
      title: article.title,
      url: article.url,
      publishedAt: article.published_at,
      description: article.description,
      sourceName: article.source || 'Unknown'
    }));
  } catch (error) {
    console.error('❌ [FACTCHECK] Mediastack error:', error.message);
    return [];
  }
}

/**
 * Use OpenAI to analyze and verify the claim against sources
 */
async function analyzeWithAI(eventDescription, allSources) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });

  // Prepare source summaries for AI analysis
  const sourceSummaries = allSources
    .slice(0, 10) // Limit to 10 sources to avoid token limits
    .map((s, idx) => `[${idx + 1}] ${s.sourceName}: "${s.title}" (${s.publishedAt || 'Unknown date'})`)
    .join('\n');

  const prompt = `You are a professional fact-checker analyzing a claim against verified news sources.

**CLAIM TO VERIFY:**
${eventDescription}

**SOURCES FOUND:**
${sourceSummaries || 'No sources found'}

**YOUR TASK:**
Analyze if the claim is supported by the sources and provide:
1. A neutral, factual summary of what actually happened
2. Assessment of source agreement (how many sources support the claim)
3. Any contradictions or inconsistencies
4. Overall verification status

Return ONLY valid JSON (no markdown, no code fences) with these exact fields:
{
  "title": "Brief neutral headline (max 100 chars)",
  "summary": "Factual 2-3 sentence summary of the event",
  "agreementRatio": 0.0-1.0,
  "verificationSummary": "Detailed analysis of verification results (150-300 words)",
  "isVerified": true/false,
  "contradictions": ["any contradictions found"],
  "keyFindings": ["key finding 1", "key finding 2", "key finding 3"]
}`;

  try {
    console.log('🤖 [FACTCHECK] Sending to OpenAI for analysis...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert fact-checker who analyzes claims against verified sources. Always be neutral and evidence-based."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    
    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from markdown code fence
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    console.log('✅ [FACTCHECK] AI analysis complete');
    return analysis;
  } catch (error) {
    console.error('❌ [FACTCHECK] AI analysis error:', error.message);
    
    // Fallback to basic analysis
    return {
      title: eventDescription.substring(0, 100),
      summary: `Fact-check in progress. ${allSources.length} sources found.`,
      agreementRatio: allSources.length > 0 ? 0.5 : 0,
      verificationSummary: `Found ${allSources.length} related sources. AI analysis failed, manual review recommended.`,
      isVerified: false,
      contradictions: ['AI analysis unavailable'],
      keyFindings: [`${allSources.length} sources identified for review`]
    };
  }
}

/**
 * Calculate recency score (days since oldest source)
 */
function calculateRecency(sources) {
  if (sources.length === 0) return 999; // Very old if no sources

  const dates = sources
    .map(s => {
      if (!s.publishedAt) return null;
      // Parse date from various formats
      const date = new Date(s.publishedAt);
      return isNaN(date.getTime()) ? null : date;
    })
    .filter(d => d !== null);

  if (dates.length === 0) return 999;

  const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const daysSince = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSince;
}

/**
 * Main POST handler
 */
export async function POST(request) {
  const startTime = Date.now();
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 FACTCHECK REQUEST RECEIVED');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // Parse request body
    const body = await request.json();
    const { eventDescription, searchQuery } = body;

    if (!eventDescription || typeof eventDescription !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'eventDescription is required and must be a string'
      }, { status: 400 });
    }

    console.log(`📝 [FACTCHECK] Claim: "${eventDescription.substring(0, 100)}..."`);

    // Use searchQuery if provided, otherwise extract key terms from description
    const query = searchQuery || eventDescription.split(' ').slice(0, 10).join(' ');
    console.log(`🔎 [FACTCHECK] Search query: "${query}"`);

    // Search all news APIs in parallel
    console.log('🌐 [FACTCHECK] Searching news sources...');
    const [newsAPIResults, gdeltResults, mediastackResults] = await Promise.all([
      searchNewsAPI(query),
      searchGDELT(query),
      searchMediastack(query)
    ]);

    // Combine all sources
    const allSources = [
      ...newsAPIResults,
      ...gdeltResults,
      ...mediastackResults
    ];

    console.log(`📊 [FACTCHECK] Total sources found: ${allSources.length}`);
    console.log(`   - NewsAPI: ${newsAPIResults.length}`);
    console.log(`   - GDELT: ${gdeltResults.length}`);
    console.log(`   - Mediastack: ${mediastackResults.length}`);

    // Analyze with AI
    const analysis = await analyzeWithAI(eventDescription, allSources);

    // Calculate recency
    const recency = calculateRecency(allSources);
    console.log(`📅 [FACTCHECK] Recency: ${recency} days since oldest source`);

    // Calculate credibility score
    const sourceCount = allSources.length;
    const agreementRatio = analysis.agreementRatio || 0;
    const credibilityScore = calculateCredibilityScore(sourceCount, agreementRatio, recency);

    console.log(`🎯 [FACTCHECK] Credibility Score: ${credibilityScore}`);
    console.log(`   - Sources: ${sourceCount}`);
    console.log(`   - Agreement: ${(agreementRatio * 100).toFixed(0)}%`);
    console.log(`   - Recency: ${recency} days`);

    // Validation: Minimum credibility threshold
    const MIN_CREDIBILITY = 0.6;
    const MIN_SOURCES = 2;

    // Count unique independent sources (by domain)
    const uniqueSources = new Set(
      allSources.map(s => {
        try {
          const url = new URL(s.url);
          return url.hostname.replace(/^www\./, '');
        } catch {
          return s.sourceName;
        }
      })
    );
    const independentSourceCount = uniqueSources.size;

    console.log(`🔍 [FACTCHECK] Validation:`);
    console.log(`   - Independent sources: ${independentSourceCount} (min: ${MIN_SOURCES})`);
    console.log(`   - Credibility: ${credibilityScore} (min: ${MIN_CREDIBILITY})`);

    // Check if event meets minimum requirements
    const meetsCredibilityThreshold = credibilityScore >= MIN_CREDIBILITY;
    const meetsSourceThreshold = independentSourceCount >= MIN_SOURCES;
    const isAccepted = meetsCredibilityThreshold && meetsSourceThreshold;

    if (!isAccepted) {
      const reasons = [];
      if (!meetsCredibilityThreshold) {
        reasons.push(`Credibility score ${credibilityScore} is below minimum ${MIN_CREDIBILITY}`);
      }
      if (!meetsSourceThreshold) {
        reasons.push(`Only ${independentSourceCount} independent source(s) found, need at least ${MIN_SOURCES}`);
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('❌ FACTCHECK REJECTED');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`⚠️  Reasons: ${reasons.join(', ')}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      return NextResponse.json({
        success: false,
        accepted: false,
        error: 'Event does not meet verification requirements',
        reasons: reasons,
        result: {
          title: analysis.title,
          summary: analysis.summary,
          credibilityScore: credibilityScore,
          independentSourceCount: independentSourceCount,
          minimumRequirements: {
            credibilityScore: MIN_CREDIBILITY,
            independentSources: MIN_SOURCES
          },
          verificationSummary: analysis.verificationSummary,
          metadata: {
            sourceCount: sourceCount,
            uniqueSourceCount: independentSourceCount,
            agreementRatio: agreementRatio,
            recencyDays: recency,
            timestamp: new Date().toISOString()
          }
        }
      }, { status: 422 }); // 422 Unprocessable Entity
    }

    console.log(`✅ [FACTCHECK] Event ACCEPTED (meets all requirements)`);

    // Prepare response
    const response = {
      success: true,
      accepted: true,
      result: {
        title: analysis.title,
        summary: analysis.summary,
        sources: allSources.map(s => ({
          name: s.sourceName,
          url: s.url,
          publishedAt: s.publishedAt,
          source: s.source
        })),
        credibilityScore: credibilityScore,
        verificationSummary: analysis.verificationSummary,
        isVerified: analysis.isVerified,
        metadata: {
          sourceCount: sourceCount,
          independentSourceCount: independentSourceCount,
          agreementRatio: agreementRatio,
          recencyDays: recency,
          contradictions: analysis.contradictions || [],
          keyFindings: analysis.keyFindings || [],
          validationPassed: {
            credibilityThreshold: meetsCredibilityThreshold,
            sourceThreshold: meetsSourceThreshold
          },
          minimumRequirements: {
            credibilityScore: MIN_CREDIBILITY,
            independentSources: MIN_SOURCES
          },
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime
        }
      }
    };

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ FACTCHECK COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Score: ${credibilityScore} (${analysis.isVerified ? 'VERIFIED' : 'UNVERIFIED'})`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [FACTCHECK] Fatal error:', error);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

/**
 * GET handler - returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/factCheck',
    method: 'POST',
    description: 'Fact-checks event descriptions using multiple news sources and AI analysis',
    usage: {
      method: 'POST',
      contentType: 'application/json',
      body: {
        eventDescription: 'string (required) - The claim or event to verify',
        searchQuery: 'string (optional) - Custom search query, defaults to first 10 words of description'
      }
    },
    response: {
      success: 'boolean',
      result: {
        title: 'string - Neutral headline',
        summary: 'string - Factual summary',
        sources: 'array - List of sources used',
        credibilityScore: 'number (0-1) - Overall credibility',
        verificationSummary: 'string - Detailed analysis',
        isVerified: 'boolean - Whether claim is verified',
        metadata: 'object - Additional details'
      }
    },
    example: {
      eventDescription: 'The James Webb Space Telescope discovered the oldest known galaxy',
      searchQuery: 'James Webb oldest galaxy discovery'
    },
    sources: ['NewsAPI', 'GDELT', 'Mediastack (optional)'],
    ai: 'OpenAI GPT-4',
    version: '1.0.0'
  });
}
