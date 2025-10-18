/**
 * Credibility Scoring System for RealTea
 * Calculates truthfulness and reliability of events
 */

/**
 * Calculate credibility score for an event
 * Score range: 0-100
 * 
 * Factors:
 * - Verified sources: +10 per source (max 40 points)
 * - User votes: upvotes - downvotes (max 30 points)
 * - Admin verification: +20 points
 * - Community corrections: +10 points if approved
 * - Age penalty: -5 points if > 1 year old without recent edits
 */
export function calculateCredibilityScore(event) {
  let score = 0;
  
  // 1. Verified Sources (max 40 points)
  const sourcesScore = Math.min(
    (event.verifiedSources?.length || 1) * 10,
    40
  );
  score += sourcesScore;
  
  // 2. User Votes (max 30 points)
  const upvotes = event.upvotes || 0;
  const downvotes = event.downvotes || 0;
  const netVotes = upvotes - downvotes;
  const votesScore = Math.max(
    Math.min(netVotes * 2, 30),
    -20 // Can go negative if heavily downvoted
  );
  score += votesScore;
  
  // 3. Admin Verification (20 points)
  if (event.verified === true) {
    score += 20;
  } else if (event.verified === false) {
    score -= 10; // Penalty for rejected events
  }
  
  // 4. Community Corrections (+10 points)
  if (event.approvedCorrections > 0) {
    score += Math.min(event.approvedCorrections * 5, 10);
  }
  
  // 5. Multiple API Confirmations (+10 points)
  if (event.multipleApiConfirmations) {
    score += 10;
  }
  
  // 6. Age Penalty (for stale unverified events)
  if (!event.verified && event.createdAt) {
    const ageInDays = (Date.now() - event.createdAt.toDate?.().getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) {
      score -= 5;
    }
  }
  
  // 7. AI Consistency Check
  if (event.aiConsistencyScore) {
    score += event.aiConsistencyScore * 0.1; // 0-10 points
  }
  
  // Clamp score between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get credibility badge based on score
 */
export function getCredibilityBadge(score) {
  if (score >= 90) return { label: 'Highly Credible', color: '#00ff00', icon: '✅' };
  if (score >= 70) return { label: 'Verified', color: '#00ffaa', icon: '✓' };
  if (score >= 50) return { label: 'Likely Accurate', color: '#ffd166', icon: '◐' };
  if (score >= 30) return { label: 'Unverified', color: '#ff9966', icon: '◯' };
  return { label: 'Disputed', color: '#e63946', icon: '⚠' };
}

/**
 * Get source transparency level
 */
export function getSourceTransparency(event) {
  const badges = [];
  
  // Verified Source badge
  if (event.verified) {
    badges.push({ 
      label: 'Verified Source', 
      color: '#00ffaa',
      icon: '✓'
    });
  }
  
  // Multiple Confirmations
  if (event.verifiedSources?.length > 1) {
    badges.push({
      label: `${event.verifiedSources.length} Sources`,
      color: '#4cc9f0',
      icon: '📰'
    });
  }
  
  // User Disputed
  if ((event.downvotes || 0) > (event.upvotes || 0)) {
    badges.push({
      label: 'User Disputed',
      color: '#e63946',
      icon: '⚠'
    });
  }
  
  // Community Edited
  if (event.approvedCorrections > 0) {
    badges.push({
      label: 'Community Edited',
      color: '#D4AF37',
      icon: '✏️'
    });
  }
  
  // Breaking News
  if (event.isBreaking) {
    badges.push({
      label: 'Breaking',
      color: '#ff006e',
      icon: '🔥'
    });
  }
  
  return badges;
}

/**
 * Calculate engagement score
 * Based on views, votes, and corrections
 */
export function calculateEngagementScore(event) {
  const views = event.views || 0;
  const totalVotes = (event.upvotes || 0) + (event.downvotes || 0);
  const corrections = event.totalCorrections || 0;
  
  // Weighted engagement
  return Math.round(
    (views * 0.5) + 
    (totalVotes * 10) + 
    (corrections * 20)
  );
}

/**
 * Calculate final homepage ranking score
 * Factors:
 * - Credibility: 50%
 * - Recency: 30%
 * - Engagement: 20%
 */
export function calculateRankingScore(event) {
  const credibility = calculateCredibilityScore(event);
  
  // Recency score (0-100)
  let recency = 0;
  if (event.createdAt) {
    const ageInHours = (Date.now() - event.createdAt.toDate?.().getTime()) / (1000 * 60 * 60);
    if (ageInHours < 24) recency = 100;
    else if (ageInHours < 48) recency = 80;
    else if (ageInHours < 168) recency = 60; // 1 week
    else if (ageInHours < 720) recency = 40; // 1 month
    else recency = 20;
  }
  
  // Engagement score (normalize to 0-100)
  const engagementRaw = calculateEngagementScore(event);
  const engagement = Math.min(engagementRaw / 100, 100);
  
  // Weighted final score
  const finalScore = (
    (credibility * 0.5) +
    (recency * 0.3) +
    (engagement * 0.2)
  );
  
  return Math.round(finalScore);
}

/**
 * Detect if event is contested
 * (mixed votes or low credibility with high engagement)
 */
export function isContested(event) {
  const upvotes = event.upvotes || 0;
  const downvotes = event.downvotes || 0;
  const totalVotes = upvotes + downvotes;
  
  if (totalVotes < 10) return false; // Not enough votes
  
  const ratio = upvotes / totalVotes;
  const credibility = calculateCredibilityScore(event);
  
  // Contested if:
  // - Vote ratio between 40-60% (divided opinion)
  // - OR low credibility with high engagement
  return (
    (ratio >= 0.4 && ratio <= 0.6) ||
    (credibility < 50 && totalVotes > 50)
  );
}

