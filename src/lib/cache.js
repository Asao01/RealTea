"use client";

/**
 * Simple client-side caching for Firestore queries
 * Reduces redundant API calls and improves performance
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data
 */
export function getCached(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Set cache data
 */
export function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clearAllCache() {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

