/**
 * Multi-Source News Fetcher
 * Aggregates news from multiple sources:
 * - NewsAPI
 * - GDELT
 * - Wikipedia "On This Day"
 * - BBC World RSS
 * - Reuters RSS
 * 
 * Combines, deduplicates, and enriches events with multi-source credibility scoring
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300; // 5 minutes

/**
 * Fetch from NewsAPI
 */
async function fetchFromNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.log('⚠️ [NEWS API] No API key configured, skipping...');
    return [];
  }

  try {
    console.log('📰 [NEWS API] Fetching...');
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?language=en&pageSize=50&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`);
    
    const data = await response.json();
    const articles = (data.articles || []).map(article => ({
      source: 'NewsAPI',
      title: article.title,
      description: article.description || article.content?.substring(0, 200),
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      sourceName: article.source.name,
      category: 'World'
    }));

    console.log(`✅ [NEWS API] Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`❌ [NEWS API] Error:`, error.message);
    return [];
  }
}

/**
 * Fetch from GDELT
 */
async function fetchFromGDELT() {
  try {
    console.log('🌐 [GDELT] Fetching...');
    const query = encodeURIComponent('world OR politics OR science OR technology');
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json&sort=datedesc`,
      { 
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'RealTea-Timeline/1.0' }
      }
    );

    if (!response.ok) throw new Error(`GDELT error: ${response.status}`);
    
    const data = await response.json();
    const articles = (data.articles || []).map(article => ({
      source: 'GDELT',
      title: article.title,
      description: article.title,
      url: article.url,
      imageUrl: article.socialimage,
      publishedAt: article.seendate,
      sourceName: article.domain,
      category: 'World',
      location: article.sourcecountry
    }));

    console.log(`✅ [GDELT] Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`❌ [GDELT] Error:`, error.message);
    return [];
  }
}

/**
 * Fetch Wikipedia "On This Day"
 */
async function fetchFromWikipedia() {
  try {
    console.log('📚 [WIKIPEDIA] Fetching...');
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const response = await fetch(
      `https://byabbe.se/on-this-day/${month}/${day}/events.json`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) throw new Error(`Wikipedia API error: ${response.status}`);
    
    const data = await response.json();
    const articles = (data.events || []).slice(0, 10).map(event => ({
      source: 'Wikipedia',
      title: `${event.year}: ${event.description}`,
      description: event.description,
      url: event.wikipedia?.[0]?.wikipedia || `https://wikipedia.org/wiki/${encodeURIComponent(event.description.substring(0, 50))}`,
      imageUrl: event.wikipedia?.[0]?.thumbnail || '',
      publishedAt: `${event.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      sourceName: 'Wikipedia',
      category: 'History',
      year: event.year
    }));

    console.log(`✅ [WIKIPEDIA] Fetched ${articles.length} historical events`);
    return articles;
  } catch (error) {
    console.error(`❌ [WIKIPEDIA] Error:`, error.message);
    return [];
  }
}

/**
 * Fetch from BBC RSS
 */
async function fetchFromBBC() {
  try {
    console.log('🌍 [BBC] Fetching...');
    const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
    
    const response = await fetch(rssUrl, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'RealTea-Timeline/1.0' }
    });

    if (!response.ok) throw new Error(`BBC RSS error: ${response.status}`);
    
    const xmlText = await response.text();
    
    // Simple XML parsing for RSS
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    
    const items = xmlText.match(itemRegex) || [];
    const articles = items.slice(0, 20).map(item => {
      const title = item.match(titleRegex)?.[1] || '';
      const description = item.match(descRegex)?.[1]?.replace(/<[^>]*>/g, '') || '';
      const url = item.match(linkRegex)?.[1] || '';
      const pubDate = item.match(pubDateRegex)?.[1] || new Date().toISOString();

      return {
        source: 'BBC',
        title,
        description,
        url,
        imageUrl: '',
        publishedAt: new Date(pubDate).toISOString(),
        sourceName: 'BBC News',
        category: 'World'
      };
    }).filter(article => article.title && article.url);

    console.log(`✅ [BBC] Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`❌ [BBC] Error:`, error.message);
    return [];
  }
}

/**
 * Fetch from Reuters RSS
 */
async function fetchFromReuters() {
  try {
    console.log('📡 [REUTERS] Fetching...');
    const rssUrl = 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best';
    
    const response = await fetch(rssUrl, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'RealTea-Timeline/1.0' }
    });

    if (!response.ok) throw new Error(`Reuters RSS error: ${response.status}`);
    
    const xmlText = await response.text();
    
    // Simple XML parsing for RSS
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    
    const items = xmlText.match(itemRegex) || [];
    const articles = items.slice(0, 20).map(item => {
      const titleMatch = item.match(titleRegex);
      const descMatch = item.match(descRegex);
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').replace(/<[^>]*>/g, '');
      const description = (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]*>/g, '');
      const url = item.match(linkRegex)?.[1] || '';
      const pubDate = item.match(pubDateRegex)?.[1] || new Date().toISOString();

      return {
        source: 'Reuters',
        title,
        description,
        url,
        imageUrl: '',
        publishedAt: new Date(pubDate).toISOString(),
        sourceName: 'Reuters',
        category: 'World'
      };
    }).filter(article => article.title && article.url);

    console.log(`✅ [REUTERS] Fetched ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`❌ [REUTERS] Error:`, error.message);
    return [];
  }
}

/**
 * Calculate multi-source credibility score
 */
function calculateMultiSourceCredibility(articles, title) {
  // Find similar articles across sources
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalizedTitle.split(' ').filter(w => w.length > 3);
  
  const similarArticles = articles.filter(article => {
    const articleTitle = article.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    return words.some(word => articleTitle.includes(word));
  });

  // Count unique sources
  const uniqueSources = new Set(similarArticles.map(a => a.source)).size;
  
  // Base score
  let score = 50;
  
  // Add points for multiple sources
  if (uniqueSources >= 2) score += 20;
  if (uniqueSources >= 3) score += 15;
  if (uniqueSources >= 4) score += 10;
  if (uniqueSources >= 5) score += 5;
  
  // Add points for reputable sources
  const reputableSources = ['BBC', 'Reuters', 'Wikipedia'];
  const hasReputableSource = similarArticles.some(a => reputableSources.includes(a.source));
  if (hasReputableSource) score += 10;
  
  return {
    score: Math.min(100, score),
    sourceCount: uniqueSources,
    verified: uniqueSources >= 2,
    underReview: uniqueSources < 2
  };
}

/**
 * Deduplicate and merge articles
 */
function deduplicateArticles(allArticles) {
  const seen = new Map();
  const merged = [];

  for (const article of allArticles) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    
    if (!seen.has(key)) {
      seen.set(key, article);
      merged.push({
        ...article,
        sources: [{ source: article.source, url: article.url }]
      });
    } else {
      // Merge with existing
      const existing = seen.get(key);
      existing.sources.push({ source: article.source, url: article.url });
      
      // Update if this has better info
      if (!existing.description && article.description) {
        existing.description = article.description;
      }
      if (!existing.imageUrl && article.imageUrl) {
        existing.imageUrl = article.imageUrl;
      }
    }
  }

  return merged;
}

/**
 * Main handler
 */
export async function GET(request) {
  const startTime = Date.now();
  let totalFetched = 0;
  let saved = 0;
  let errors = 0;

  try {
    console.log('\n🌐 ===== MULTI-SOURCE NEWS FETCH =====');
    console.log(`⏰ ${new Date().toISOString()}`);

    if (!db) throw new Error('Firestore not initialized');

    // Fetch from all sources in parallel
    const [newsAPIArticles, gdeltArticles, wikipediaArticles, bbcArticles, reutersArticles] = await Promise.all([
      fetchFromNewsAPI(),
      fetchFromGDELT(),
      fetchFromWikipedia(),
      fetchFromBBC(),
      fetchFromReuters()
    ]);

    // Combine all articles
    const allArticles = [
      ...newsAPIArticles,
      ...gdeltArticles,
      ...wikipediaArticles,
      ...bbcArticles,
      ...reutersArticles
    ];

    totalFetched = allArticles.length;
    console.log(`\n📊 Total articles fetched: ${totalFetched}`);

    // Deduplicate
    const uniqueArticles = deduplicateArticles(allArticles);
    console.log(`🔄 After deduplication: ${uniqueArticles.length} unique articles`);

    // Save to Firestore
    for (const article of uniqueArticles.slice(0, 50)) { // Limit to 50 best articles
      try {
        const credibility = calculateMultiSourceCredibility(allArticles, article.title);
        
        const docId = article.title
          .replace(/[^a-zA-Z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase()
          .slice(0, 200);

        const eventRef = doc(db, 'events', docId);
        const existingDoc = await getDoc(eventRef);

        // Skip if recently updated
        if (existingDoc.exists()) {
          const lastUpdate = existingDoc.data().updatedAt?.toMillis?.() || 0;
          if (Date.now() - lastUpdate < 12 * 60 * 60 * 1000) continue; // 12 hours
        }

        await setDoc(eventRef, {
          title: article.title,
          description: article.description || "Summary pending verification...",
          longDescription: article.description || "Full context will be generated by AI shortly.",
          date: article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          category: article.category || 'World',
          location: article.location || 'Global',
          region: 'Global',
          sources: article.sources.map(s => s.url),
          verifiedSource: article.url,
          imageUrl: article.imageUrl || '',
          credibilityScore: credibility.score,
          importanceScore: 70,
          verified: credibility.verified,
          underReview: credibility.underReview,
          sourceCount: credibility.sourceCount,
          addedBy: `Multi-Source Aggregator (${article.sources.length} sources)`,
          author: article.sourceName,
          newsGenerated: true,
          aiGenerated: false,
          enriched: false,
          createdAt: existingDoc.exists() ? existingDoc.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: false });

        saved++;
        console.log(`  ✅ Saved: ${article.title.substring(0, 60)}... (Score: ${credibility.score}, Sources: ${credibility.sourceCount})`);
      } catch (error) {
        console.error(`  ❌ Error saving article:`, error.message);
        errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ MULTI-SOURCE FETCH COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total Fetched: ${totalFetched}`);
    console.log(`🔄 Unique Articles: ${uniqueArticles.length}`);
    console.log(`✅ Saved: ${saved}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      fetched: totalFetched,
      unique: uniqueArticles.length,
      saved,
      errors,
      durationSeconds: parseFloat(duration),
      sources: {
        NewsAPI: newsAPIArticles.length,
        GDELT: gdeltArticles.length,
        Wikipedia: wikipediaArticles.length,
        BBC: bbcArticles.length,
        Reuters: reutersArticles.length
      }
    });

  } catch (error) {
    console.error('❌ [MULTI-SOURCE] Fatal error:', error);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      saved,
      errors: errors + 1,
      durationSeconds: parseFloat(duration)
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}


