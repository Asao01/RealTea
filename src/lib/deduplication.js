/**
 * Event Deduplication Helper
 * Prevents duplicate events from being saved to Firestore
 */

import { collection, query, where, getDocs, limit, or } from "firebase/firestore";

/**
 * Check if event already exists in Firestore
 * Checks by title OR urlHash
 * 
 * @param {Object} db - Firestore instance
 * @param {string} title - Event title
 * @param {string} urlHash - URL hash (if from news)
 * @param {string} date - Event date (YYYY-MM-DD)
 * @returns {Object|null} - Existing event or null
 */
export async function checkDuplicateEvent(db, title, urlHash = null, date = null) {
  try {
    const eventsRef = collection(db, 'events');
    
    // First try: Check by URL hash (most reliable for news)
    if (urlHash) {
      const urlQuery = query(
        eventsRef,
        where('urlHash', '==', urlHash),
        limit(1)
      );
      const urlSnapshot = await getDocs(urlQuery);
      
      if (!urlSnapshot.empty) {
        const existing = urlSnapshot.docs[0];
        console.log(`🔍 [DEDUP] Found duplicate by urlHash: ${existing.id}`);
        return { id: existing.id, ...existing.data() };
      }
    }
    
    // Second try: Check by exact title match
    if (title) {
      const titleQuery = query(
        eventsRef,
        where('title', '==', title),
        limit(1)
      );
      const titleSnapshot = await getDocs(titleQuery);
      
      if (!titleSnapshot.empty) {
        const existing = titleSnapshot.docs[0];
        console.log(`🔍 [DEDUP] Found duplicate by title: ${existing.id}`);
        return { id: existing.id, ...existing.data() };
      }
    }
    
    // Third try: Check by title + date (for historical events)
    if (title && date) {
      const titleDateQuery = query(
        eventsRef,
        where('title', '==', title),
        where('date', '==', date),
        limit(1)
      );
      const titleDateSnapshot = await getDocs(titleDateQuery);
      
      if (!titleDateSnapshot.empty) {
        const existing = titleDateSnapshot.docs[0];
        console.log(`🔍 [DEDUP] Found duplicate by title+date: ${existing.id}`);
        return { id: existing.id, ...existing.data() };
      }
    }
    
    // No duplicates found
    return null;
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    // Fail safe: allow save if check fails
    return null;
  }
}

/**
 * Remove duplicates from array of events client-side
 * Uses eventId as primary key
 */
export function removeDuplicateEvents(events) {
  const seen = new Set();
  const unique = [];
  
  for (const event of events) {
    // Use eventId as primary identifier
    const key = event.id || event.eventId;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    } else {
      console.log(`🔄 [DEDUP] Removed duplicate: ${event.title}`);
    }
  }
  
  return unique;
}

/**
 * Remove duplicates by title (case-insensitive)
 * Keeps the one with highest credibility score
 */
export function removeDuplicatesByTitle(events) {
  const titleMap = new Map();
  
  for (const event of events) {
    const titleKey = event.title?.toLowerCase().trim();
    if (!titleKey) continue;
    
    const existing = titleMap.get(titleKey);
    
    if (!existing) {
      titleMap.set(titleKey, event);
    } else {
      // Keep the one with higher credibility score
      const existingScore = existing.credibilityScore || 0;
      const currentScore = event.credibilityScore || 0;
      
      if (currentScore > existingScore) {
        console.log(`🔄 [DEDUP] Replaced duplicate (higher score): ${event.title}`);
        titleMap.set(titleKey, event);
      } else {
        console.log(`🔄 [DEDUP] Skipped duplicate (lower score): ${event.title}`);
      }
    }
  }
  
  return Array.from(titleMap.values());
}

/**
 * Calculate similarity between two strings (0-1)
 * Used for fuzzy duplicate detection
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Simple Levenshtein distance approximation
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default {
  checkDuplicateEvent,
  removeDuplicateEvents,
  removeDuplicatesByTitle,
  calculateSimilarity
};

