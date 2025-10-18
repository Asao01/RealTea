/**
 * Event Deduplication Utilities
 * Ensures unique events across the platform
 */

/**
 * Normalize title for comparison
 * - Lowercase
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalizeTitle(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Collapse whitespace
    .trim();
}

/**
 * Deduplicate events array
 * Priority:
 * 1. urlHash (most reliable)
 * 2. Normalized title
 * 3. Keep highest credibility score
 */
export function dedupeEvents(events) {
  if (!Array.isArray(events)) return [];
  
  const seenUrlHashes = new Set();
  const seenTitles = new Map();
  const unique = [];
  
  events.forEach(event => {
    // Skip if no title
    if (!event.title) return;
    
    // Check urlHash first (for news articles)
    if (event.urlHash) {
      if (seenUrlHashes.has(event.urlHash)) {
        console.log(`🔄 [DEDUPE] Skipped by urlHash: ${event.title.substring(0, 60)}...`);
        return;
      }
      seenUrlHashes.add(event.urlHash);
    }
    
    // Check normalized title
    const normalizedTitle = normalizeTitle(event.title);
    const existing = seenTitles.get(normalizedTitle);
    
    if (!existing) {
      seenTitles.set(normalizedTitle, event);
      unique.push(event);
    } else {
      // Keep the one with higher credibility
      const existingScore = existing.credibilityScore || 0;
      const currentScore = event.credibilityScore || 0;
      
      if (currentScore > existingScore) {
        // Replace existing
        const index = unique.findIndex(e => e.id === existing.id);
        if (index !== -1) {
          unique[index] = event;
          seenTitles.set(normalizedTitle, event);
          console.log(`🔄 [DEDUPE] Replaced: ${event.title} (score ${existingScore} → ${currentScore})`);
        }
      } else {
        console.log(`⏭️ [DEDUPE] Skipped lower score: ${event.title}`);
      }
    }
  });
  
  console.log(`✅ [DEDUPE] ${events.length} → ${unique.length} unique events`);
  return unique;
}

/**
 * Filter events by date range
 */
export function filterByDateRange(events, startDate, endDate) {
  if (!Array.isArray(events)) return [];
  
  return events.filter(event => {
    if (!event.createdAt) return false;
    
    const eventTime = event.createdAt.toDate?.().getTime() || 0;
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Date.now();
    
    return eventTime >= start && eventTime <= end;
  });
}

/**
 * Cache key generator for home feed
 */
export function getHomeCacheKey() {
  const date = new Date().toISOString().split('T')[0];
  const hour = Math.floor(new Date().getHours() / 6); // 0-3 (6-hour chunks)
  return `home:v2:${date}:${hour}`;
}

/**
 * Get cached home events (6-hour cache)
 */
export function getCachedHomeEvents() {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = getHomeCacheKey();
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      console.log(`📦 [CACHE] Using cached home events (key: ${cacheKey})`);
      return data.events;
    }
  } catch (error) {
    console.error('❌ [CACHE] Error reading cache:', error);
  }
  
  return null;
}

/**
 * Set cached home events
 */
export function setCachedHomeEvents(events) {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = getHomeCacheKey();
    localStorage.setItem(cacheKey, JSON.stringify({
      events,
      cachedAt: Date.now(),
      key: cacheKey
    }));
    console.log(`💾 [CACHE] Cached ${events.length} home events (key: ${cacheKey})`);
  } catch (error) {
    console.error('❌ [CACHE] Error writing cache:', error);
  }
}

export default {
  normalizeTitle,
  dedupeEvents,
  filterByDateRange,
  getHomeCacheKey,
  getCachedHomeEvents,
  setCachedHomeEvents
};

