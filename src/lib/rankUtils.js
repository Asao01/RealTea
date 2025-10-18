/**
 * Event Ranking System
 * Calculates dynamic rank scores based on multiple signals
 */

/**
 * Default weights for ranking formula
 * Customize these based on your priorities
 */
export const DEFAULT_WEIGHTS = {
  credibility: 0.40,      // 40% - AI credibility score
  freshness: 0.30,        // 30% - How recent the event is
  engagement: 0.20,       // 20% - User interactions
  neutrality: 0.10,       // 10% - Bonus for neutral bias
};

/**
 * Category diversity settings
 */
const CATEGORY_DIVERSITY = {
  enabled: true,
  penaltyPerDuplicate: 5,  // Reduce score by 5 points per duplicate in same category
  maxPenalty: 25,          // Maximum penalty
};

/**
 * Calculate freshness score (0-100)
 * Newer events score higher
 */
export function calculateFreshnessScore(event) {
  if (!event.createdAt) return 50; // Default for events without timestamp

  try {
    const createdDate = event.createdAt.toDate ? event.createdAt.toDate() : new Date(event.createdAt);
    const now = new Date();
    const ageInHours = (now - createdDate) / (1000 * 60 * 60);

    // Scoring curve:
    // 0-6 hours: 100 points
    // 6-24 hours: 90-100 points
    // 1-7 days: 70-90 points
    // 7-30 days: 40-70 points
    // 30+ days: 0-40 points

    if (ageInHours < 6) return 100;
    if (ageInHours < 24) return 90 + (10 * (1 - (ageInHours - 6) / 18));
    
    const ageInDays = ageInHours / 24;
    if (ageInDays < 7) return 70 + (20 * (1 - (ageInDays - 1) / 6));
    if (ageInDays < 30) return 40 + (30 * (1 - (ageInDays - 7) / 23));
    if (ageInDays < 90) return 20 + (20 * (1 - (ageInDays - 30) / 60));
    
    return Math.max(0, 20 - (ageInDays - 90) / 10);

  } catch (error) {
    console.error('Error calculating freshness:', error);
    return 50;
  }
}

/**
 * Calculate engagement score (0-100)
 * Based on views, upvotes, downvotes, comments
 */
export function calculateEngagementScore(event) {
  const views = event.views || 0;
  const upvotes = event.upvotes || 0;
  const downvotes = event.downvotes || 0;
  const comments = event.commentCount || 0;
  const shares = event.shares || 0;

  // Weighted engagement formula
  const engagementPoints = (
    (views * 0.1) +           // 0.1 point per view
    (upvotes * 5) +           // 5 points per upvote
    (downvotes * -3) +        // -3 points per downvote
    (comments * 10) +         // 10 points per comment
    (shares * 15)             // 15 points per share
  );

  // Normalize to 0-100 scale
  // Assume 100 points = good engagement, cap at 500 points for excellent
  const normalizedScore = Math.min(100, (engagementPoints / 500) * 100);
  
  return Math.max(0, normalizedScore);
}

/**
 * Calculate neutrality bonus (0-10)
 * Rewards neutral bias, penalizes extreme bias
 */
export function calculateNeutralityBonus(event) {
  const bias = event.biasLabel || event.bias || 'unknown';

  const biasScores = {
    'neutral': 10,
    'unknown': 5,
    'left-leaning': 3,
    'right-leaning': 3,
    'left': 2,
    'right': 2,
    'state-controlled': 0,
    'state': 0,
    'conspiracy': -5,
    'sensational': 0,
  };

  return biasScores[bias.toLowerCase()] || 5;
}

/**
 * Calculate category diversity penalty
 * Prevents homepage from being dominated by one category
 */
export function calculateCategoryDiversityPenalty(event, allEvents, topN = 20) {
  if (!CATEGORY_DIVERSITY.enabled) return 0;
  if (!event.category) return 0;

  // Count how many events in top N share the same category
  const topEvents = allEvents.slice(0, topN);
  const sameCategoryCount = topEvents.filter(
    e => e.id !== event.id && e.category === event.category
  ).length;

  // Apply penalty
  const penalty = Math.min(
    sameCategoryCount * CATEGORY_DIVERSITY.penaltyPerDuplicate,
    CATEGORY_DIVERSITY.maxPenalty
  );

  return penalty;
}

/**
 * Calculate breaking news boost
 * Breaking news gets significant boost
 */
export function calculateBreakingBoost(event) {
  if (event.isBreaking) {
    // Check if it's still recent enough to be "breaking"
    if (event.createdAt) {
      const createdDate = event.createdAt.toDate ? event.createdAt.toDate() : new Date(event.createdAt);
      const ageInHours = (Date.now() - createdDate) / (1000 * 60 * 60);
      
      // Breaking boost decays after 24 hours
      if (ageInHours < 24) {
        return 30 - (ageInHours / 24) * 15; // 30 points at 0h, 15 points at 24h
      }
    }
    return 15; // Still some boost for older breaking news
  }
  return 0;
}

/**
 * Calculate fact-check status boost/penalty
 */
export function calculateFactCheckModifier(event) {
  const status = event.factCheckStatus || event.verifiedSource ? 'verified' : 'unverified';

  const modifiers = {
    'verified': 10,
    'unverified': 0,
    'disputed': -10,
    'false': -50,
  };

  return modifiers[status.toLowerCase()] || 0;
}

/**
 * Main ranking function
 * Calculates overall rank score for an event
 */
export function calculateRankScore(event, options = {}) {
  const {
    weights = DEFAULT_WEIGHTS,
    allEvents = [],
    applyDiversityPenalty = true,
  } = options;

  // Get individual component scores
  const credibilityScore = event.credibilityScore || event.credibility || 70; // 0-100
  const freshnessScore = calculateFreshnessScore(event); // 0-100
  const engagementScore = calculateEngagementScore(event); // 0-100
  const neutralityBonus = calculateNeutralityBonus(event); // 0-10 (scaled to 0-100)

  // Calculate base rank score using weighted formula
  let rankScore = (
    (credibilityScore * weights.credibility) +
    (freshnessScore * weights.freshness) +
    (engagementScore * weights.engagement) +
    ((neutralityBonus * 10) * weights.neutrality) // Scale 0-10 to 0-100
  );

  // Apply boosters and modifiers
  rankScore += calculateBreakingBoost(event);
  rankScore += calculateFactCheckModifier(event);

  // Apply category diversity penalty if enabled
  if (applyDiversityPenalty && allEvents.length > 0) {
    const diversityPenalty = calculateCategoryDiversityPenalty(event, allEvents);
    rankScore -= diversityPenalty;
  }

  // Cap at 0-100 range
  rankScore = Math.max(0, Math.min(100, rankScore));

  return Math.round(rankScore * 10) / 10; // Round to 1 decimal place
}

/**
 * Rank and sort an array of events
 * Returns events with rankScore added and sorted by rank
 */
export function rankAndSortEvents(events, options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  console.log(`📊 [RANK] Ranking ${events.length} events...`);

  // First pass: calculate rank scores without diversity penalty
  const eventsWithScores = events.map(event => ({
    ...event,
    rankScore: calculateRankScore(event, { ...options, applyDiversityPenalty: false })
  }));

  // Sort by initial rank
  eventsWithScores.sort((a, b) => b.rankScore - a.rankScore);

  // Second pass: apply diversity penalty based on sorted order
  if (options.applyDiversityPenalty !== false) {
    eventsWithScores.forEach((event, index) => {
      const penalty = calculateCategoryDiversityPenalty(event, eventsWithScores, 20);
      event.rankScore = Math.max(0, event.rankScore - penalty);
      event.diversityPenalty = penalty;
    });

    // Re-sort after applying penalties
    eventsWithScores.sort((a, b) => b.rankScore - a.rankScore);
  }

  // Log top 5 for debugging
  const top5 = eventsWithScores.slice(0, 5).map(e => ({
    title: e.title?.substring(0, 50),
    rank: e.rankScore,
    cred: e.credibilityScore,
    fresh: calculateFreshnessScore(e).toFixed(1),
    engage: calculateEngagementScore(e).toFixed(1)
  }));
  
  console.log(`📊 [RANK] Top 5:`, top5);

  return eventsWithScores;
}

/**
 * Get top N events by rank
 */
export function getTopRankedEvents(events, n = 10, options = {}) {
  const ranked = rankAndSortEvents(events, options);
  return ranked.slice(0, n);
}

/**
 * Filter and rank events for homepage
 * - Recent or breaking only
 * - High credibility threshold
 * - Diverse categories
 */
export function getHomepageEvents(events, options = {}) {
  const {
    maxAge = 7, // days
    minCredibility = 60,
    limit = 8,
  } = options;

  console.log(`🏠 [RANK] Filtering for homepage...`);

  // Filter for homepage criteria
  const filtered = events.filter(event => {
    // Always include breaking news
    if (event.isBreaking) return true;

    // Check credibility
    const credibility = event.credibilityScore || event.credibility || 70;
    if (credibility < minCredibility) return false;

    // Check age
    if (event.createdAt) {
      try {
        const createdDate = event.createdAt.toDate ? event.createdAt.toDate() : new Date(event.createdAt);
        const ageInDays = (Date.now() - createdDate) / (1000 * 60 * 60 * 24);
        if (ageInDays > maxAge) return false;
      } catch (error) {
        return false;
      }
    }

    return true;
  });

  console.log(`🏠 [RANK] ${events.length} → ${filtered.length} after filtering`);

  // Rank and return top N
  const ranked = rankAndSortEvents(filtered, {
    applyDiversityPenalty: true,
    ...options
  });

  return ranked.slice(0, limit);
}

/**
 * Analyze ranking distribution
 * Useful for debugging and optimization
 */
export function analyzeRankingDistribution(events) {
  if (!events || events.length === 0) return null;

  const scores = events.map(e => e.rankScore || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  const categoryCounts = {};
  events.forEach(e => {
    const cat = e.category || 'Unknown';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return {
    total: events.length,
    average: avg.toFixed(2),
    max: max.toFixed(2),
    min: min.toFixed(2),
    categoryDistribution: categoryCounts,
    scoreDistribution: {
      '90-100': scores.filter(s => s >= 90).length,
      '80-89': scores.filter(s => s >= 80 && s < 90).length,
      '70-79': scores.filter(s => s >= 70 && s < 80).length,
      '60-69': scores.filter(s => s >= 60 && s < 70).length,
      '0-59': scores.filter(s => s < 60).length,
    }
  };
}

/**
 * Update rank scores in Firestore (batch)
 */
export async function updateRankScoresInFirestore(events, db) {
  console.log(`🔄 [RANK] Updating ${events.length} events in Firestore...`);

  const { doc, updateDoc } = await import('firebase/firestore');
  
  let updated = 0;
  let failed = 0;

  for (const event of events) {
    if (!event.id || event.rankScore === undefined) continue;

    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        rankScore: event.rankScore,
        rankedAt: new Date(),
      });
      updated++;
    } catch (error) {
      console.error(`❌ [RANK] Failed to update ${event.id}:`, error);
      failed++;
    }
  }

  console.log(`✅ [RANK] Updated ${updated} events, ${failed} failed`);
  return { updated, failed };
}

/**
 * Recalculate and update all event ranks (maintenance job)
 */
export async function recalculateAllRanks(db, options = {}) {
  console.log(`🔄 [RANK] Starting full rank recalculation...`);

  const { collection, getDocs } = await import('firebase/firestore');
  
  // Fetch all events
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(eventsRef);
  
  const events = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  console.log(`📊 [RANK] Loaded ${events.length} events`);

  // Rank them
  const rankedEvents = rankAndSortEvents(events, options);

  // Update in Firestore
  const result = await updateRankScoresInFirestore(rankedEvents, db);

  // Return analysis
  const analysis = analyzeRankingDistribution(rankedEvents);

  return {
    ...result,
    analysis,
    totalEvents: events.length
  };
}

export default {
  calculateRankScore,
  rankAndSortEvents,
  getTopRankedEvents,
  getHomepageEvents,
  calculateFreshnessScore,
  calculateEngagementScore,
  calculateNeutralityBonus,
  analyzeRankingDistribution,
  recalculateAllRanks,
  DEFAULT_WEIGHTS,
};

