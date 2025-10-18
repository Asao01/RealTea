/**
 * Source Trust Tracking System
 * Tracks reliability of news sources over time
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * Update trust score for a domain
 * @param {string} domain - Source domain (e.g., "reuters.com")
 * @param {number} delta - Change in trust (+1 for success, -2 for failure)
 */
export async function updateTrust(domain, delta) {
  try {
    if (!domain || !db) return;
    
    // Clean domain (remove www, protocol, etc.)
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();
    
    const trustRef = doc(db, 'sourceTrust', cleanDomain);
    const trustSnap = await getDoc(trustRef);
    
    if (!trustSnap.exists()) {
      // Create new trust record
      await setDoc(trustRef, {
        domain: cleanDomain,
        trustScore: Math.max(0, delta),
        verificationCount: 1,
        successCount: delta > 0 ? 1 : 0,
        failureCount: delta < 0 ? 1 : 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log(`✨ [TRUST] New domain tracked: ${cleanDomain} (score: ${delta})`);
    } else {
      // Update existing trust record
      const currentScore = trustSnap.data().trustScore || 0;
      const newScore = Math.max(0, currentScore + delta);
      
      await updateDoc(trustRef, {
        trustScore: newScore,
        verificationCount: increment(1),
        successCount: increment(delta > 0 ? 1 : 0),
        failureCount: increment(delta < 0 ? 1 : 0),
        updatedAt: serverTimestamp()
      });
      
      console.log(`📊 [TRUST] Updated ${cleanDomain}: ${currentScore} → ${newScore} (${delta > 0 ? '+' : ''}${delta})`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ [TRUST] Error updating trust:', error);
    return false;
  }
}

/**
 * Get trust score for a domain
 * @param {string} domain - Source domain
 * @returns {Promise<number>} Trust score (default 0)
 */
export async function getTrust(domain) {
  try {
    if (!domain || !db) return 0;
    
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();
    
    const trustRef = doc(db, 'sourceTrust', cleanDomain);
    const trustSnap = await getDoc(trustRef);
    
    if (!trustSnap.exists()) {
      return 0;
    }
    
    const score = trustSnap.data().trustScore || 0;
    console.log(`📊 [TRUST] ${cleanDomain}: ${score}`);
    
    return score;
  } catch (error) {
    console.error('❌ [TRUST] Error getting trust:', error);
    return 0;
  }
}

/**
 * Get trust score for a URL
 */
export async function getTrustFromUrl(url) {
  try {
    if (!url) return 0;
    const domain = new URL(url).hostname;
    return await getTrust(domain);
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate weighted trust bonus for sources
 */
export async function calculateTrustBonus(sources) {
  if (!sources || sources.length === 0) return 0;
  
  let totalTrust = 0;
  
  for (const source of sources.slice(0, 5)) { // Max 5 sources
    const trust = await getTrustFromUrl(source);
    totalTrust += trust;
  }
  
  // Average trust, capped at 10 bonus points
  const avgTrust = totalTrust / sources.length;
  return Math.min(10, avgTrust);
}

export default {
  updateTrust,
  getTrust,
  getTrustFromUrl,
  calculateTrustBonus
};

