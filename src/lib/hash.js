/**
 * Hash utility for URL deduplication
 */

/**
 * Generate SHA-1 hash from text
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hash string
 */
export async function makeHash(text) {
  if (!text) return '';
  
  // Use Web Crypto API for SHA-1
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // For server-side (Node.js)
  if (typeof window === 'undefined') {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(text).digest('hex');
  }
  
  // For client-side
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Generate URL hash for deduplication
 * Falls back to title+source if URL missing
 */
export async function generateUrlHash(url, title, sourceName) {
  const hashInput = url || `${title || ''}:${sourceName || ''}`;
  return await makeHash(hashInput);
}

/**
 * Simple text sanitization (strip HTML)
 */
export function sanitizeText(text) {
  if (!text) return '';
  
  // Remove HTML tags
  let clean = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  clean = clean
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  return clean.trim();
}

