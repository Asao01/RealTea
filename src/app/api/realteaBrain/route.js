/**
 * RealTea Brain - Central AI Truth Curation Engine
 * 
 * Collects, analyzes, and verifies information from multiple global perspectives
 * Runs every 3 hours to ensure balanced, multi-source truth
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, setDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { updateTrust } from '@/lib/sourceTrust';
import { analyzeBias, getBiasLabel, getToneLabel, getAlignmentEmoji } from '@/lib/biasAnalyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Collect data from multiple global news sources
 */
async function collectMultiSourceData(eventTitle) {
  const corroboration = {
    western: [],
    eastern: [],
    globalSouth: [],
    independent: [],
    official: []
  };

  try {
    // Source 1: NewsAPI (Western mainstream)
    const newsApiKey = process.env.NEWS_API_KEY;
    if (newsApiKey) {
      const query = encodeURIComponent(eventTitle.substring(0, 100));
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&pageSize=5&sortBy=relevancy&language=en&apiKey=${newsApiKey}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        const articles = data.articles || [];
        
        articles.forEach(article => {
          const source = article.source?.name || 'Unknown';
          const text = `${source}: "${article.title}" - ${article.description || ''}`;
          
          // Categorize by source origin
          if (['Reuters', 'AP', 'BBC', 'Guardian', 'NYTimes', 'Washington Post', 'CNN'].some(s => source.includes(s))) {
            corroboration.western.push(text);
          } else {
            corroboration.independent.push(text);
          }
        });
      }
    }

    // Source 2: Wikipedia/Wikidata for historical/factual context
    const wikiQuery = encodeURIComponent(eventTitle.substring(0, 100));
    try {
      const wikiResponse = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiQuery}`,
        { headers: { 'User-Agent': 'RealTea/1.0' } }
      );
      
      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        if (wikiData.extract) {
          corroboration.independent.push(`Wikipedia: ${wikiData.extract}`);
        }
      }
    } catch (e) {
      console.warn('⚠️ Wikipedia lookup failed');
    }

    // Source 3: GDELT would go here (requires specific implementation)
    // For now, we'll add placeholder for global perspective
    
    return corroboration;

  } catch (error) {
    console.error('❌ [COLLECT] Error collecting multi-source data:', error.message);
    return corroboration;
  }
}

/**
 * Calculate credibility score based on sources and corroboration
 */
function calculateCredibilityScore(sources, corroboration, existingScore = 70) {
  let score = existingScore;

  // Reputable source bonuses
  const reputableSources = [
    { pattern: /reuters\.com|reuters/i, bonus: 10, name: 'Reuters' },
    { pattern: /apnews\.com|associated press/i, bonus: 10, name: 'AP' },
    { pattern: /bbc\.(com|co\.uk)|bbc news/i, bonus: 10, name: 'BBC' },
    { pattern: /nasa\.gov/i, bonus: 8, name: 'NASA' },
    { pattern: /who\.int/i, bonus: 8, name: 'WHO' },
    { pattern: /un\.org/i, bonus: 8, name: 'UN' },
    { pattern: /theguardian\.com|guardian/i, bonus: 7, name: 'Guardian' },
    { pattern: /aljazeera\.com|al jazeera/i, bonus: 7, name: 'Al Jazeera' },
    { pattern: /nytimes\.com/i, bonus: 6, name: 'NYTimes' }
  ];

  const foundSources = [];
  sources.forEach(source => {
    reputableSources.forEach(rep => {
      if (rep.pattern.test(source)) {
        score += rep.bonus;
        foundSources.push(rep.name);
      }
    });
  });

  // Multi-source corroboration bonus
  const totalCorroboration = 
    corroboration.western.length +
    corroboration.eastern.length +
    corroboration.globalSouth.length +
    corroboration.independent.length;

  if (totalCorroboration >= 5) score += 10;
  else if (totalCorroboration >= 3) score += 5;

  // Regional diversity bonus
  const hasWestern = corroboration.western.length > 0;
  const hasEastern = corroboration.eastern.length > 0;
  const hasGlobalSouth = corroboration.globalSouth.length > 0;
  const hasIndependent = corroboration.independent.length > 0;
  
  const diversityCount = [hasWestern, hasEastern, hasGlobalSouth, hasIndependent].filter(Boolean).length;
  if (diversityCount >= 3) score += 8;
  else if (diversityCount >= 2) score += 5;

  // Archive.org or Wikipedia corroboration bonus
  if (corroboration.independent.some(s => s.includes('Wikipedia') || s.includes('Archive'))) {
    score += 3;
  }

  // Penalty for single source only
  if (totalCorroboration === 1) score -= 10;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Main RealTea Brain Function
 */
export async function GET(request) {
  try {
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('🧠 REALTEA BRAIN - CENTRAL AI TRUTH CURATOR');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();
    const results = {
      processed: 0,
      enriched: 0,
      verified: 0,
      updated: 0,
      flagged: 0,
      errors: 0
    };

    // Validate API keys
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

    // Fetch latest 25 events for processing
    console.log('📡 [BRAIN] Fetching latest 25 events from Firestore...');
    const eventsRef = collection(db, 'events');
    const eventsQuery = query(eventsRef, orderBy('createdAt', 'desc'), limit(25));
    const snapshot = await getDocs(eventsQuery);

    if (snapshot.empty) {
      console.log('✅ [BRAIN] No events to process');
      return NextResponse.json({
        success: true,
        message: 'No events to process',
        results
      });
    }

    console.log(`📊 [BRAIN] Found ${snapshot.size} events to process`);
    console.log('');

    // Process each event
    for (const eventDoc of snapshot.docs) {
      try {
        results.processed++;
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        console.log(`\n🔍 [${results.processed}/${snapshot.size}] Processing: ${eventData.title?.substring(0, 60)}...`);

        // Skip if recently processed (within 6 hours)
        if (eventData.lastVerified) {
          const lastVerified = eventData.lastVerified.toDate?.() || new Date(eventData.lastVerified);
          const hoursSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60);
          
          if (hoursSince < 6) {
            console.log(`   ⏭️  Recently processed ${hoursSince.toFixed(1)}h ago - skipping`);
            continue;
          }
        }

        // Step 1: Collect multi-source corroboration
        console.log('   📡 Collecting multi-source data...');
        const corroboration = await collectMultiSourceData(eventData.title);
        
        const totalSources = 
          corroboration.western.length +
          corroboration.eastern.length +
          corroboration.globalSouth.length +
          corroboration.independent.length;

        console.log(`      Western: ${corroboration.western.length} | Eastern: ${corroboration.eastern.length} | Global South: ${corroboration.globalSouth.length} | Independent: ${corroboration.independent.length}`);

        // Step 2: Build comprehensive prompt for AI analysis
        const comprehensivePrompt = `You are RealTea — an AI historian and analyst tasked with creating an unbiased, globally accurate, 1-page report.

Compare the following event data gathered from multiple news and reference sources.
Write a balanced article (800–1200 words) including:
1. Clear timeline of what happened
2. Global context and consequences
3. Differing perspectives from at least 2 sides
4. Verified factual claims only, with source names
5. Avoid speculation, political bias, or emotional tone

Finish with a short "Perspective Summary" listing:
- Western coverage summary (1–2 sentences)
- Eastern/Global South coverage summary (1–2 sentences)
- Independent analyst overview (1–2 sentences)

EVENT TITLE: ${eventData.title}
CURRENT INFO: ${eventData.longDescription || eventData.description || 'Limited information'}
DATE: ${eventData.date || 'Unknown'}
LOCATION: ${eventData.location || 'Unknown'}
CATEGORY: ${eventData.category || 'Unknown'}

WESTERN SOURCES:
${corroboration.western.join('\n') || 'None available'}

EASTERN/GLOBAL SOUTH SOURCES:
${corroboration.eastern.join('\n') || 'None available'}
${corroboration.globalSouth.join('\n') || 'None available'}

INDEPENDENT/HISTORICAL SOURCES:
${corroboration.independent.join('\n') || 'None available'}

Return ONLY valid JSON (no markdown, no code fences):
{
  "title": "Clear, neutral headline",
  "description": "2-3 sentence summary",
  "longDescription": "800-1200 word balanced article including timeline, context, multiple perspectives, and perspective summary section",
  "category": "Politics|Conflict|Science|Culture|Environment|Tech|Economy|World",
  "location": "City, Country or Region",
  "date": "YYYY-MM-DD",
  "sources": ["Source1", "Source2", "Source3"],
  "credibilityScore": 0-100,
  "verified": true/false,
  "biasNotes": "Explanation of source balance and perspectives included",
  "importanceScore": 0-100
}`;

        // Step 3: Call OpenAI for comprehensive analysis
        console.log('   🤖 Generating multi-perspective analysis...');
        
        let aiAnalysis;
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are RealTea, a globally balanced AI historian. Analyze events from multiple perspectives. Be neutral, factual, and comprehensive. Include Western, Eastern, and Global South viewpoints when available."
              },
              {
                role: "user",
                content: comprehensivePrompt
              }
            ],
            max_tokens: 2500,
            temperature: 0.3,
            response_format: { type: "json_object" }
          });

          const responseText = completion.choices[0].message.content;
          aiAnalysis = JSON.parse(responseText);
          
          const wordCount = (aiAnalysis.longDescription || '').split(/\s+/).length;
          console.log(`      ✅ Generated: ${wordCount} words, ${aiAnalysis.longDescription?.length || 0} chars`);

        } catch (error) {
          console.log(`      ❌ AI analysis failed: ${error.message}`);
          results.errors++;
          continue;
        }

        // Step 4: Calculate credibility score
        const allSources = [
          ...(eventData.sources || []),
          ...(aiAnalysis.sources || [])
        ];

        const credibilityScore = calculateCredibilityScore(
          allSources,
          corroboration,
          eventData.credibilityScore || 70
        );

        const isVerified = credibilityScore >= 85;
        const isFlagged = credibilityScore < 60;

        console.log(`      📊 Credibility: ${credibilityScore}/100 (${isVerified ? 'VERIFIED ✅' : isFlagged ? 'FLAGGED ❌' : 'REVIEW ⚠️'})`);

        // Step 4.5: Analyze bias and tone
        console.log('   🎯 Analyzing bias and narrative tone...');
        const biasAnalysis = await analyzeBias(
          aiAnalysis.longDescription || eventData.description || '',
          allSources
        );

        let biasScore = 0;
        let toneScore = 50;
        let alignment = 'Neutral';
        let biasSummary = 'Insufficient data for bias analysis';

        if (biasAnalysis) {
          biasScore = biasAnalysis.biasScore;
          toneScore = biasAnalysis.toneScore;
          alignment = biasAnalysis.alignment;
          biasSummary = biasAnalysis.biasSummary;
          
          console.log(`      ${getAlignmentEmoji(alignment)} Bias: ${biasScore} (${getBiasLabel(biasScore)}), Tone: ${toneScore} (${getToneLabel(toneScore)}), Alignment: ${alignment}`);
        }

        // Step 5: Update Firestore event
        const eventRef = doc(db, 'events', eventId);
        
        const updates = {
          title: aiAnalysis.title || eventData.title,
          description: aiAnalysis.description || eventData.description,
          longDescription: aiAnalysis.longDescription,
          category: aiAnalysis.category || eventData.category,
          location: aiAnalysis.location || eventData.location,
          date: aiAnalysis.date || eventData.date,
          sources: [...new Set([...allSources])].slice(0, 10), // Dedupe, max 10
          biasNotes: aiAnalysis.biasNotes || '',
          biasScore: biasScore,                    // NEW: -100 to +100
          toneScore: toneScore,                    // NEW: 0 to 100
          alignment: alignment,                     // NEW: Left/Right/Neutral/State
          biasSummary: biasSummary,                // NEW: Explanation
          credibilityScore: credibilityScore,
          verified: isVerified,
          flagged: isFlagged,
          importanceScore: aiAnalysis.importanceScore || eventData.importanceScore || 60,
          lastVerified: serverTimestamp(),
          enrichedAt: serverTimestamp(),
          processedBy: 'RealTea Brain',
          perspectivesIncluded: {
            western: corroboration.western.length > 0,
            eastern: corroboration.eastern.length > 0,
            globalSouth: corroboration.globalSouth.length > 0,
            independent: corroboration.independent.length > 0
          }
        };

        await updateDoc(eventRef, updates);
        
        results.enriched++;
        if (isVerified) results.verified++;
        if (isFlagged) results.flagged++;
        results.updated++;

        console.log('      💾 Firestore updated');

        // Step 5.5: Save bias metrics to subcollection
        if (biasAnalysis) {
          await setDoc(doc(db, `events/${eventId}/biasMetrics`, 'latest'), {
            biasScore: biasScore,
            toneScore: toneScore,
            alignment: alignment,
            biasSummary: biasSummary,
            analyzedAt: serverTimestamp(),
            sourcesAnalyzed: allSources.length,
            perspectiveDiversity: {
              western: corroboration.western.length,
              eastern: corroboration.eastern.length,
              globalSouth: corroboration.globalSouth.length,
              independent: corroboration.independent.length
            },
            biasLabel: getBiasLabel(biasScore),
            toneLabel: getToneLabel(toneScore),
            alignmentEmoji: getAlignmentEmoji(alignment)
          });
          
          console.log('      📊 Bias metrics saved to subcollection');
        }

        // Step 6: Add AI comment explaining the analysis
        const commentText = `Multi-perspective analysis complete. ${aiAnalysis.biasNotes || 'Balanced coverage from multiple sources.'}

Sources analyzed: ${totalSources} (Western: ${corroboration.western.length}, Eastern: ${corroboration.eastern.length}, Independent: ${corroboration.independent.length})

Bias Analysis:
• Bias Score: ${biasScore}/100 ${getBiasLabel(biasScore)}
• Tone Score: ${toneScore}/100 ${getToneLabel(toneScore)}
• Alignment: ${getAlignmentEmoji(alignment)} ${alignment}
• Summary: ${biasSummary}

Credibility score: ${credibilityScore}/100${isVerified ? ' - VERIFIED ✅' : isFlagged ? ' - FLAGGED for review ❌' : ' - Under review ⚠️'}`;

        await addDoc(collection(db, `events/${eventId}/ai_comments`), {
          text: commentText,
          author: 'RealTea Brain',
          userId: 'system-brain',
          isAI: true,
          credibilityScore: credibilityScore,
          verified: isVerified,
          sourcesAnalyzed: totalSources,
          perspectiveDiversity: [
            corroboration.western.length > 0 && 'Western',
            corroboration.eastern.length > 0 && 'Eastern',
            corroboration.globalSouth.length > 0 && 'Global South',
            corroboration.independent.length > 0 && 'Independent'
          ].filter(Boolean),
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp()
        });

        console.log('      💬 AI comment added');

        // Step 7: Update source trust scores
        for (const source of aiAnalysis.sources || []) {
          const trustDelta = isVerified ? 1 : isFlagged ? -2 : 0;
          if (trustDelta !== 0) {
            await updateTrust(source, trustDelta);
          }
        }

        console.log('      ⭐ Trust scores updated');

        // Rate limiting - 3 seconds between events
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`   ❌ Error processing event:`, error.message);
        results.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Summary
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('🧠 REALTEA BRAIN - PROCESSING COMPLETE');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📊 Results:`);
    console.log(`   • Processed: ${results.processed} events`);
    console.log(`   • Enriched: ${results.enriched} with full articles`);
    console.log(`   • Verified: ${results.verified} (credibility ≥85)`);
    console.log(`   • Flagged: ${results.flagged} (credibility <60)`);
    console.log(`   • Updated: ${results.updated} in Firestore`);
    console.log(`   • Errors: ${results.errors}`);
    console.log(`⏱️  Total Duration: ${duration}s`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      message: 'RealTea Brain processing completed',
      results: {
        ...results,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [BRAIN] Fatal error:', error);
    
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
