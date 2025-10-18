/**
 * Simple in-memory rate limiter
 */

const rateLimitMap = new Map();

/**
 * Rate limit check (1 call per minute per route)
 * @param {string} key - Route identifier
 * @returns {boolean} True if allowed, false if rate limited
 */
export function checkRateLimit(key) {
  const now = Date.now();
  const lastCall = rateLimitMap.get(key);
  
  if (lastCall && (now - lastCall) < 60000) {
    const waitTime = Math.ceil((60000 - (now - lastCall)) / 1000);
    console.warn(`⏱️ [RATE LIMIT] ${key} - Wait ${waitTime}s`);
    return false;
  }
  
  rateLimitMap.set(key, now);
  return true;
}

/**
 * Clear rate limit for a key (for testing)
 */
export function clearRateLimit(key) {
  rateLimitMap.delete(key);
}

