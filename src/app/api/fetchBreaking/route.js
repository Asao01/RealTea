/**
 * API Route: /api/fetchBreaking
 * Fetches breaking news from NewsAPI and generates 500-800 word articles with OpenAI
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { saveEvent } from '@/lib/firestoreService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Fetch Wikipedia "On This Day" events
 */
async function fetchWikipediaOnThisDay() {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${month}/${day}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RealTea/1.0' }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    const events = data.events || [];
    
    console.log(`📚 [WIKIPEDIA] Found ${events.length} "On This Day" events`);
    
    return events.slice(0, 3).map(event => ({
      title: event.text,
      description: event.pages?.[0]?.extract || event.text,
      url: event.pages?.[0]?.content_urls?.desktop?.page || `https://wikipedia.org`,
      source: { name: 'Wikipedia' },
      publishedAt: new Date().toISOString(),
      urlToImage: event.pages?.[0]?.thumbnail?.source || '',
      year: event.year
    }));
  } catch (error) {
    console.error('❌ [WIKIPEDIA] Error:', error.message);
    return [];
  }
}

export async function GET(request) {
  try {
    console.log('🔥 [BREAKING] Starting breaking news fetch...');
    
    const startTime = Date.now();
    let processed = 0;
    let saved = 0;
    let errors = 0;

    // Check for required API keys
    const newsApiKey = process.env.NEWS_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!newsApiKey) {
      return NextResponse.json({
        success: false,
        error: 'NEWS_API_KEY not configured'
      }, { status: 500 });
    }

    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not configured'
      }, { status: 500 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Fetch news from NewsAPI
    console.log('📡 [BREAKING] Fetching from NewsAPI...');
    const cacheBuster = Math.random().toString(36).substring(2, 8);
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&sortBy=publishedAt&apiKey=${newsApiKey}&cb=${cacheBuster}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const newsData = await response.json();
    let articles = newsData.articles || [];

    // Fetch Wikipedia "On This Day" events and merge
    const wikiArticles = await fetchWikipediaOnThisDay();
    articles = [...articles, ...wikiArticles];

    if (articles.length === 0) {
      console.log('⚠️ [BREAKING] No articles returned from any source');
      return NextResponse.json({
        success: true,
        results: { processed: 0, saved: 0, errors: 0 }
      });
    }

    console.log(`📰 [BREAKING] Processing ${articles.length} articles (NewsAPI + Wikipedia)`);

    // Process each article
    for (const article of articles) {
      try {
        processed++;

        if (!article.title || !article.url) {
          console.log(`  ⏭️ Skipping article without title/URL`);
          continue;
        }

        console.log(`  📝 Processing: ${article.title.substring(0, 60)}...`);

        // Generate comprehensive article with OpenAI
        const prompt = `You are RealTea, a neutral factual historian AI.
Write a 500–800 word clear, unbiased article about this verified headline:

Title: ${article.title}
Summary: ${article.description ?? "N/A"}
Source: ${article.url ?? "N/A"}
Published: ${article.publishedAt ?? "N/A"}

Cover: background context, what happened, why it matters, key people/places involved, immediate consequences, and list 3–5 reputable sources for verification.

Return ONLY valid JSON (no markdown, no code fences) with these exact fields:
{
  "title": "Clear neutral headline",
  "longDescription": "Your full 500–800 word article here",
  "date": "YYYY-MM-DD",
  "location": "City, Country",
  "category": "Politics|Science|Technology|War|Environment|Economy|Culture|Medicine|Space|Human Rights|World",
  "region": "Global|North America|Europe|Asia|Africa|Middle East|South America|Oceania",
  "sources": ["url1", "url2", "url3"],
  "credibilityScore": 0-100,
  "importanceScore": 0-100
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional journalist and historian. Write comprehensive, factual articles in JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        // Parse the JSON response
        const text = completion.choices[0].message.content;
        let eventData;
        
        try {
          // Try to parse as JSON object directly
          eventData = JSON.parse(text);
        } catch (e) {
          // If that fails, try to extract JSON from markdown code fence
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            eventData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Could not parse JSON from OpenAI response');
          }
        }

        // Validate longDescription length
        const wordCount = (eventData.longDescription || '').split(/\s+/).length;
        console.log(`    📊 Generated article: ${wordCount} words, ${eventData.longDescription?.length || 0} chars`);

        // Save to Firestore
        await saveEvent({
          title: eventData.title || article.title,
          longDescription: eventData.longDescription,
          date: eventData.date || article.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          location: eventData.location || article.source?.name || 'Global',
          category: eventData.category || 'World',
          region: eventData.region || 'Global',
          sources: eventData.sources || (article.url ? [article.url] : []),
          credibilityScore: eventData.credibilityScore ?? 75,
          importanceScore: eventData.importanceScore ?? 60,
          imageUrl: article.urlToImage || '',
          verifiedSource: article.url,
          url: article.url,
          source: article.source,
          addedBy: 'RealTea AI',
          newsGenerated: true,
          aiGenerated: true
        });

        saved++;
        console.log(`    ✅ Saved: "${eventData.title?.substring(0, 50)}..."`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`    ❌ Error processing article: ${error.message}`);
        
        // If OpenAI fails but we have basic article data, save it anyway without long description
        if (error.message.includes('quota') || error.message.includes('429')) {
          console.log(`    💡 [FALLBACK] Saving article without AI generation...`);
          
          try {
            await saveEvent({
              title: article.title,
              description: article.description || article.title,
              longDescription: article.description || article.content || article.title,
              date: article.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              location: article.source?.name || 'Global',
              category: 'News',
              region: 'Global',
              sources: article.url ? [article.url] : [],
              credibilityScore: 65,
              importanceScore: 50,
              imageUrl: article.urlToImage || '',
              verifiedSource: article.url,
              url: article.url,
              source: article.source,
              addedBy: 'RealTea News Bot',
              newsGenerated: true,
              aiGenerated: false
            });
            
            saved++;
            console.log(`    ✅ Saved without AI enhancement: "${article.title.substring(0, 50)}..."`);
          } catch (saveError) {
            console.error(`    ❌ Fallback save also failed: ${saveError.message}`);
            errors++;
          }
        } else {
          errors++;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ BREAKING NEWS FETCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Processed: ${processed} | Saved: ${saved} | Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    return NextResponse.json({
      success: true,
      results: {
        processed,
        saved,
        errors,
        durationSeconds: parseFloat(duration)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [BREAKING] Fatal error:', error);
    
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
