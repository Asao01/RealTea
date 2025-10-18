/**
 * News API Integration
 * Fetches and normalizes news articles
 */

import { sanitizeText } from './hash';

/**
 * Fetch top headlines from News API
 * @param {number} pageSize - Number of articles to fetch (default 20)
 * @returns {Promise<Array>} Array of articles
 */
export async function fetchTopHeadlines(pageSize = 20) {
  const apiKey = process.env.NEWS_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEWS_API_KEY not configured');
  }

  console.log(`📰 [NEWS API] Fetching top ${pageSize} headlines...`);

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=${pageSize}&apiKey=${apiKey}`,
      { 
        cache: 'no-store',
        next: { revalidate: 0 }
      }
    );

    if (!response.ok) {
      throw new Error(`News API HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`News API status: ${data.status}`);
    }

    const articles = data.articles || [];
    console.log(`✅ [NEWS API] Fetched ${articles.length} articles`);
    
    return articles;
  } catch (error) {
    console.error(`❌ [NEWS API] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Normalize article data
 * @param {Object} article - Raw news article
 * @returns {Object} Normalized article
 */
export function normalizeArticle(article) {
  return {
    title: sanitizeText(article.title || ''),
    description: sanitizeText(article.description || ''),
    content: sanitizeText(article.content || ''),
    url: article.url || '',
    urlToImage: article.urlToImage || '',
    publishedAt: article.publishedAt || new Date().toISOString(),
    source: {
      name: article.source?.name || 'Unknown',
      id: article.source?.id || ''
    },
    author: article.author || 'Unknown'
  };
}

