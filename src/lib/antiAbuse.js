/**
 * Anti-Abuse & Bias Detection System
 * Protects RealTea from manipulation and maintains integrity
 */

import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";

/**
 * Calculate user trust score
 * Range: 0-100
 * - 50: Default for new users
 * - 70+: Trusted user
 * - <20: Suspicious/flagged
 */
export function calculateTrustScore(userData) {
  let score = 50; // Base score
  
  // 1. Account Age Bonus
  if (userData.createdAt) {
    const accountAgeInDays = (Date.now() - userData.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeInDays > 365) score += 10; // 1+ year
    else if (accountAgeInDays > 180) score += 5; // 6+ months
    else if (accountAgeInDays > 30) score += 2; // 1+ month
  }
  
  // 2. Verified Email
  if (userData.emailVerified) {
    score += 5;
  }
  
  // 3. Voting Accuracy
  const alignedVotes = userData.alignedVotes || 0;
  const totalVotes = userData.totalVotes || 0;
  if (totalVotes > 10) {
    const accuracy = alignedVotes / totalVotes;
    if (accuracy > 0.7) score += 10;
    else if (accuracy < 0.3) score -= 10;
  }
  
  // 4. Low-credibility upvote penalty
  const lowCredUpvotes = userData.lowCredibilityUpvotes || 0;
  if (lowCredUpvotes > 5) {
    score -= lowCredUpvotes * 2;
  }
  
  // 5. Burst voting penalty
  if (userData.burstVoting) {
    score -= 15;
  }
  
  // 6. IP violations
  if (userData.ipViolations) {
    score -= userData.ipViolations * 3;
  }
  
  // 7. Approved corrections bonus
  if (userData.approvedCorrections > 0) {
    score += Math.min(userData.approvedCorrections * 5, 20);
  }
  
  // 8. Flagged content penalty
  if (userData.flaggedContent) {
    score -= userData.flaggedContent * 5;
  }
  
  // Clamp between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if user is rate limited
 * Max 20 votes per hour
 */
export async function checkRateLimit(userId) {
  try {
    const rateLimitRef = doc(db, 'rateLimits', `${userId}_vote`);
    const rateLimitSnap = await getDoc(rateLimitRef);
    
    if (!rateLimitSnap.exists()) {
      return { allowed: true, remaining: 20 };
    }
    
    const data = rateLimitSnap.data();
    const hourAgo = Date.now() - (60 * 60 * 1000);
    const lastReset = data.lastReset?.toDate()?.getTime() || 0;
    
    // Reset if more than an hour has passed
    if (lastReset < hourAgo) {
      await setDoc(rateLimitRef, {
        count: 0,
        lastReset: serverTimestamp(),
        userId
      });
      return { allowed: true, remaining: 20 };
    }
    
    const count = data.count || 0;
    const remaining = Math.max(0, 20 - count);
    
    if (count >= 20) {
      return { 
        allowed: false, 
        remaining: 0,
        resetAt: new Date(lastReset + (60 * 60 * 1000))
      };
    }
    
    return { allowed: true, remaining };
    
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: 20 }; // Fail open
  }
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(userId) {
  try {
    const rateLimitRef = doc(db, 'rateLimits', `${userId}_vote`);
    const rateLimitSnap = await getDoc(rateLimitRef);
    
    if (!rateLimitSnap.exists()) {
      await setDoc(rateLimitRef, {
        count: 1,
        lastReset: serverTimestamp(),
        userId
      });
    } else {
      await updateDoc(rateLimitRef, {
        count: increment(1)
      });
    }
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
  }
}

/**
 * Detect burst voting
 * Flag if more than 10 votes in 5 minutes
 */
export async function detectBurstVoting(userId) {
  try {
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    
    if (!userStatsSnap.exists()) return false;
    
    const recentVotes = userStatsSnap.data().recentVotes || [];
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    const recentCount = recentVotes.filter(
      timestamp => timestamp > fiveMinutesAgo
    ).length;
    
    return recentCount > 10;
    
  } catch (error) {
    console.error('Error detecting burst voting:', error);
    return false;
  }
}

/**
 * Track vote alignment with consensus
 * Updates user stats when voting
 */
export async function trackVoteAlignment(userId, eventData, userVote) {
  try {
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    
    const upvotes = eventData.upvotes || 0;
    const downvotes = eventData.downvotes || 0;
    const totalVotes = upvotes + downvotes;
    
    // Determine consensus (if enough votes)
    if (totalVotes < 10) return; // Not enough data
    
    const consensusIsPositive = upvotes > downvotes;
    const userVotedPositive = userVote === 1;
    const aligned = consensusIsPositive === userVotedPositive;
    
    // Check if voting on low-credibility event
    const isLowCred = (eventData.credibilityScore || 0) < 40;
    
    const updates = {
      totalVotes: increment(1),
      lastVoteAt: serverTimestamp()
    };
    
    if (aligned) {
      updates.alignedVotes = increment(1);
    }
    
    if (isLowCred && userVote === 1) {
      updates.lowCredibilityUpvotes = increment(1);
    }
    
    // Track recent votes for burst detection
    const recentVotes = userStatsSnap.exists() 
      ? (userStatsSnap.data().recentVotes || [])
      : [];
    recentVotes.push(Date.now());
    
    // Keep only last 20 votes
    updates.recentVotes = recentVotes.slice(-20);
    
    // Check for burst voting
    const isBurst = await detectBurstVoting(userId);
    if (isBurst) {
      updates.burstVoting = true;
      updates.burstDetectedAt = serverTimestamp();
    }
    
    if (userStatsSnap.exists()) {
      await updateDoc(userStatsRef, updates);
    } else {
      await setDoc(userStatsRef, {
        ...updates,
        userId,
        createdAt: serverTimestamp(),
        emailVerified: false,
        approvedCorrections: 0,
        flaggedContent: 0
      });
    }
    
  } catch (error) {
    console.error('Error tracking vote alignment:', error);
  }
}

/**
 * Content moderation - check for inappropriate content
 * Returns { clean: boolean, reason: string }
 */
export function moderateContent(text) {
  if (!text || typeof text !== 'string') {
    return { clean: true };
  }
  
  const lowerText = text.toLowerCase();
  
  // Hate speech patterns
  const hateSpeechPatterns = [
    /\b(hate|kill|death to)\s+(jews|muslims|christians|blacks|whites)/i,
    /\b(n[i!]gg[ae]r|f[a@]gg[o0]t|ch[i!]nk|sp[i!]c)\b/i,
  ];
  
  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(text)) {
      return { 
        clean: false, 
        reason: 'Hate speech detected',
        severity: 'high'
      };
    }
  }
  
  // Profanity (moderate severity)
  const profanityPatterns = [
    /\b(f[u\*]ck|sh[i!]t|b[i!]tch|[a@]ssh[o0]le|d[a@]mn|h[e3]ll)\b/i,
  ];
  
  let profanityCount = 0;
  for (const pattern of profanityPatterns) {
    if (pattern.test(text)) profanityCount++;
  }
  
  if (profanityCount > 3) {
    return { 
      clean: false, 
      reason: 'Excessive profanity',
      severity: 'medium'
    };
  }
  
  // Spam link patterns
  const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
  if (urlMatches.length > 5) {
    return { 
      clean: false, 
      reason: 'Excessive links (possible spam)',
      severity: 'low'
    };
  }
  
  // Repeated text (spam)
  const words = text.split(/\s+/);
  const wordCounts = {};
  let maxRepeat = 0;
  
  words.forEach(word => {
    if (word.length > 3) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
      maxRepeat = Math.max(maxRepeat, wordCounts[word]);
    }
  });
  
  if (maxRepeat > 10) {
    return { 
      clean: false, 
      reason: 'Repeated text (spam)',
      severity: 'low'
    };
  }
  
  // Extreme bias phrases
  const biasPatterns = [
    /\b(fake news|deep state conspiracy|sheeple|wake up america)\b/i,
    /\b(destroy|eliminate|wipe out) (liberals|conservatives|democrats|republicans)\b/i,
  ];
  
  for (const pattern of biasPatterns) {
    if (pattern.test(text)) {
      return { 
        clean: false, 
        reason: 'Extreme political bias',
        severity: 'medium'
      };
    }
  }
  
  return { clean: true };
}

/**
 * Log system action for transparency
 */
export async function logSystemAction(action) {
  try {
    const logId = `${action.actionType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logRef = doc(db, 'systemLogs', logId);
    
    await setDoc(logRef, {
      ...action,
      timestamp: serverTimestamp(),
      ipHash: action.ipHash || null // Hash IP for privacy
    });
    
  } catch (error) {
    console.error('Error logging action:', error);
  }
}

/**
 * Check if user should have voting influence
 * Users with trustScore < 20 are ignored in scoring
 */
export async function hasVotingInfluence(userId) {
  try {
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    
    if (!userStatsSnap.exists()) {
      return true; // New users have influence
    }
    
    const trustScore = calculateTrustScore(userStatsSnap.data());
    return trustScore >= 20;
    
  } catch (error) {
    console.error('Error checking voting influence:', error);
    return true; // Fail open
  }
}

/**
 * Flag user for review
 */
export async function flagUser(userId, reason, flaggedBy) {
  try {
    const flagRef = doc(db, 'flaggedUsers', userId);
    
    await setDoc(flagRef, {
      userId,
      reason,
      flaggedBy,
      flaggedAt: serverTimestamp(),
      status: 'pending',
      reviewed: false
    });
    
    // Log the action
    await logSystemAction({
      actionType: 'user_flagged',
      userId,
      reason,
      result: 'flagged'
    });
    
    console.log(`🚩 User ${userId} flagged: ${reason}`);
    
  } catch (error) {
    console.error('Error flagging user:', error);
  }
}

/**
 * Flag event for review
 */
export async function flagEvent(eventId, reason, flaggedBy) {
  try {
    const flagRef = doc(db, 'flaggedEvents', eventId);
    
    await setDoc(flagRef, {
      eventId,
      reason,
      flaggedBy,
      flaggedAt: serverTimestamp(),
      status: 'pending',
      reviewed: false
    });
    
    // Log the action
    await logSystemAction({
      actionType: 'event_flagged',
      eventId,
      reason,
      result: 'flagged'
    });
    
    console.log(`🚩 Event ${eventId} flagged: ${reason}`);
    
  } catch (error) {
    console.error('Error flagging event:', error);
  }
}

/**
 * AI bias check - compare multiple sources
 * Returns { consistent: boolean, conflictingFacts: array, sources: array }
 */
export async function checkAIBias(eventData, sources = []) {
  if (sources.length < 2) {
    return { 
      consistent: false, 
      conflictingFacts: ['Insufficient sources for verification'],
      sources: sources.length
    };
  }
  
  // In a real implementation, this would call multiple AI APIs
  // or news sources and compare the results
  
  // Simplified version: check if key facts align
  const conflicts = [];
  
  // Example checks (in production, use actual API calls)
  const dateMatches = sources.filter(s => 
    s.date && s.date === eventData.date
  ).length;
  
  if (dateMatches < sources.length * 0.5) {
    conflicts.push('Date discrepancy across sources');
  }
  
  const locationMatches = sources.filter(s =>
    s.location && s.location === eventData.location
  ).length;
  
  if (locationMatches < sources.length * 0.5) {
    conflicts.push('Location discrepancy across sources');
  }
  
  const consistent = conflicts.length === 0;
  
  return {
    consistent,
    conflictingFacts: conflicts,
    sources: sources.length,
    checkedAt: new Date().toISOString()
  };
}

export default {
  calculateTrustScore,
  checkRateLimit,
  incrementRateLimit,
  detectBurstVoting,
  trackVoteAlignment,
  moderateContent,
  logSystemAction,
  hasVotingInfluence,
  flagUser,
  flagEvent,
  checkAIBias
};

