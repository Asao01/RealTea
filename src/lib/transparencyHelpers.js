/**
 * Transparency & Source Audit Helpers
 * Aggregates and anonymizes data for public transparency page
 */

/**
 * Anonymize user ID for public display
 * Converts userId to User#XXXX format
 */
export function anonymizeUserId(userId) {
  if (!userId) return 'Anonymous';
  
  // Create consistent hash from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive 4-digit number
  const anonymousId = Math.abs(hash) % 10000;
  return `User#${String(anonymousId).padStart(4, '0')}`;
}

/**
 * Calculate source reliability metrics
 * Returns array of { domain, count, avgCredibility, trustLevel }
 */
export function calculateSourceReliability(events) {
  const domainStats = {};
  
  events.forEach(event => {
    const sources = event.verifiedSources || [];
    const eventCred = event.credibilityScore || 0;
    
    sources.forEach(source => {
      try {
        const url = typeof source === 'string' ? source : source.url;
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        
        if (!domainStats[domain]) {
          domainStats[domain] = {
            domain,
            count: 0,
            totalCredibility: 0,
            events: []
          };
        }
        
        domainStats[domain].count++;
        domainStats[domain].totalCredibility += eventCred;
        domainStats[domain].events.push(event.id);
        
      } catch (error) {
        // Invalid URL, skip
      }
    });
  });
  
  // Calculate averages and trust levels
  const results = Object.values(domainStats).map(stat => {
    const avgCredibility = stat.count > 0 
      ? Math.round(stat.totalCredibility / stat.count)
      : 0;
    
    let trustLevel = 'Unknown';
    if (avgCredibility >= 80) trustLevel = 'Highly Trusted';
    else if (avgCredibility >= 60) trustLevel = 'Trusted';
    else if (avgCredibility >= 40) trustLevel = 'Moderate';
    else trustLevel = 'Low Trust';
    
    return {
      domain: stat.domain,
      count: stat.count,
      avgCredibility,
      trustLevel,
      uniqueEvents: stat.events.length
    };
  });
  
  // Sort by count (most used first)
  return results.sort((a, b) => b.count - a.count);
}

/**
 * Get top contributors
 * Returns array of { userId, trustScore, contributions, alignedVotes }
 */
export function getTopContributors(userStats) {
  return userStats
    .map(stat => ({
      userId: anonymizeUserId(stat.userId),
      trustScore: stat.trustScore || 50,
      totalVotes: stat.totalVotes || 0,
      alignedVotes: stat.alignedVotes || 0,
      approvedCorrections: stat.approvedCorrections || 0,
      contributions: (stat.totalVotes || 0) + (stat.approvedCorrections || 0) * 10
    }))
    .filter(user => user.contributions > 0)
    .sort((a, b) => {
      // Sort by trust score first, then contributions
      if (b.trustScore !== a.trustScore) {
        return b.trustScore - a.trustScore;
      }
      return b.contributions - a.contributions;
    })
    .slice(0, 10);
}

/**
 * Format action for recent changes
 */
export function formatSystemAction(action) {
  const userId = anonymizeUserId(action.userId);
  const timestamp = action.timestamp?.toDate?.() || new Date();
  
  let description = '';
  let icon = '📝';
  let color = '#4cc9f0';
  
  switch (action.actionType) {
    case 'vote':
      icon = '🗳️';
      color = '#D4AF37';
      description = `${userId} voted on an event`;
      break;
    case 'add':
    case 'event_added':
      icon = '➕';
      color = '#00ffaa';
      description = `${userId} added a new event`;
      break;
    case 'edit':
    case 'event_edited':
      icon = '✏️';
      color = '#ffd166';
      description = `${userId} edited an event`;
      break;
    case 'flag':
    case 'event_flagged':
    case 'user_flagged':
      icon = '🚩';
      color = '#e63946';
      description = `${userId} flagged content for review`;
      break;
    case 'verify':
    case 'verified':
      icon = '✅';
      color = '#06d6a0';
      description = `Admin verified an event`;
      break;
    case 'rejected':
      icon = '❌';
      color = '#e63946';
      description = `Admin rejected an event`;
      break;
    default:
      description = `${userId} performed ${action.actionType}`;
  }
  
  return {
    id: action.id,
    timestamp,
    icon,
    color,
    description,
    actionType: action.actionType,
    result: action.result || 'completed'
  };
}

/**
 * Calculate global statistics
 */
export function calculateGlobalStats(events, userStats) {
  const stats = {
    totalEvents: events.length,
    verifiedEvents: 0,
    contestedEvents: 0,
    aiGenerated: 0,
    userSubmitted: 0,
    activeUsers: 0,
    averageCredibility: 0,
    totalVotes: 0
  };
  
  let totalCredibility = 0;
  
  events.forEach(event => {
    if (event.verified) stats.verifiedEvents++;
    if (event.contested || event.aiConflict) stats.contestedEvents++;
    if (event.aiGenerated || event.newsGenerated) stats.aiGenerated++;
    else stats.userSubmitted++;
    
    totalCredibility += (event.credibilityScore || 0);
    stats.totalVotes += (event.upvotes || 0) + (event.downvotes || 0);
  });
  
  stats.averageCredibility = events.length > 0
    ? Math.round(totalCredibility / events.length)
    : 0;
  
  // Count active users (voted in last 30 days)
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  stats.activeUsers = userStats.filter(user => {
    const lastVote = user.lastVoteAt?.toDate?.().getTime() || 0;
    return lastVote > thirtyDaysAgo;
  }).length;
  
  return stats;
}

/**
 * Get disputed events for transparency
 */
export function getDisputedEvents(events) {
  return events
    .filter(event => 
      event.contested || 
      event.aiConflict || 
      (event.credibilityScore || 0) < 40
    )
    .map(event => ({
      id: event.id,
      title: event.title,
      date: event.date || event.year,
      credibilityScore: event.credibilityScore || 0,
      reason: getDisputeReason(event),
      status: event.verified ? 'Resolved' : 'Under Review',
      upvotes: event.upvotes || 0,
      downvotes: event.downvotes || 0
    }))
    .sort((a, b) => a.credibilityScore - b.credibilityScore)
    .slice(0, 20); // Show top 20 most disputed
}

function getDisputeReason(event) {
  const reasons = [];
  
  if (event.contested) reasons.push('User Disputed');
  if (event.aiConflict) reasons.push('AI Source Conflict');
  if ((event.downvotes || 0) > (event.upvotes || 0)) reasons.push('Community Downvoted');
  if ((event.credibilityScore || 0) < 40) reasons.push('Low Credibility Score');
  
  return reasons.join(', ') || 'Unknown';
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(date) {
  if (!date) return 'Unknown';
  
  const now = Date.now();
  const timestamp = date instanceof Date ? date.getTime() : date.toDate?.().getTime();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default {
  anonymizeUserId,
  calculateSourceReliability,
  getTopContributors,
  formatSystemAction,
  calculateGlobalStats,
  getDisputedEvents,
  formatRelativeTime
};

