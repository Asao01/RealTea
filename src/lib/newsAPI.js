"use client";

/**
 * News API Integration
 * Fetches real-world news headlines to generate events
 */

/**
 * Fetch latest news headlines from public APIs
 * @param {string} category - News category filter
 * @param {number} limit - Number of articles to fetch
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchLatestNews(category = "general", limit = 10) {
  const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
  
  // Try NewsAPI first (requires API key)
  if (apiKey) {
    try {
      const keywords = category === "general" 
        ? "world OR breaking OR global OR international"
        : category;
        
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=${limit}&language=en&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return (data.articles || []).map(article => ({
        title: article.title,
        description: article.description || article.content || "",
        source: article.url,
        publishedAt: article.publishedAt,
        sourceName: article.source?.name || "Unknown",
      }));
    } catch (error) {
      console.warn("NewsAPI failed, trying fallback...", error.message);
    }
  }
  
  // Fallback: Use free RSS-to-JSON service
  try {
    const rssFeeds = [
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://www.aljazeera.com/xml/rss/all.xml',
    ];
    
    // Use rss2json free service
    const feed = rssFeeds[0];
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&count=${limit}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'ok' && data.items) {
      return data.items.map(item => ({
        title: item.title,
        description: item.description || item.content || "",
        source: item.link || item.guid,
        publishedAt: item.pubDate,
        sourceName: data.feed?.title || "News Feed",
      }));
    }
  } catch (error) {
    console.warn("RSS fallback failed:", error.message);
  }
  
  // Final fallback: Return empty array (will use historical generation)
  console.log("⚠️ All news APIs failed. Will use historical event generation instead.");
  return [];
}

/**
 * Check if an event with similar title/date already exists
 * @param {string} title - Event title
 * @param {string} date - Event date
 * @param {Array} existingEvents - Array of existing events
 * @returns {boolean} True if duplicate found
 */
export function isDuplicate(title, date, existingEvents) {
  const normalizedTitle = title.toLowerCase().trim();
  
  return existingEvents.some(event => {
    const eventTitle = (event.title || "").toLowerCase().trim();
    const eventDate = event.date;
    
    // Check if titles are very similar (Levenshtein distance or simple match)
    const titleMatch = eventTitle === normalizedTitle || 
                       eventTitle.includes(normalizedTitle.substring(0, 30)) ||
                       normalizedTitle.includes(eventTitle.substring(0, 30));
    
    const dateMatch = eventDate === date;
    
    return titleMatch && dateMatch;
  });
}

