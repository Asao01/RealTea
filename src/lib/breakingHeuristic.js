/**
 * Breaking News Detection Heuristic
 */

const BREAKING_KEYWORDS = [
  'breaking',
  'urgent',
  'alert',
  'live',
  'just in',
  'developing',
  'emergency',
  'critical',
  'major',
  'massive',
  'catastrophic',
  'tragic',
  'deadly'
];

const HIGH_URGENCY_KEYWORDS = [
  'war',
  'attack',
  'disaster',
  'crisis',
  'explosion',
  'crash',
  'death',
  'killed',
  'injured',
  'evacuate',
  'threat',
  'terror'
];

/**
 * Determine if news is breaking based on title and description
 * @param {string} title - Article title
 * @param {string} description - Article description
 * @returns {boolean} True if breaking
 */
export function isBreakingHeuristic(title, description) {
  if (!title && !description) return false;
  
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  // Check for breaking keywords
  const hasBreakingKeyword = BREAKING_KEYWORDS.some(keyword => 
    text.includes(keyword)
  );
  
  // Check for high urgency keywords
  const hasUrgencyKeyword = HIGH_URGENCY_KEYWORDS.some(keyword =>
    text.includes(keyword)
  );
  
  // Breaking if has breaking keyword OR multiple urgency keywords
  const urgencyCount = HIGH_URGENCY_KEYWORDS.filter(k => text.includes(k)).length;
  
  return hasBreakingKeyword || urgencyCount >= 2;
}

/**
 * Calculate urgency score (0-100) based on content analysis
 * @param {string} title 
 * @param {string} description 
 * @returns {number} Urgency score 0-100
 */
export function calculateUrgencyScore(title, description) {
  let score = 30; // Base score
  
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  // Add points for breaking keywords
  BREAKING_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 15;
    }
  });
  
  // Add points for urgency keywords
  HIGH_URGENCY_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 10;
    }
  });
  
  // Cap at 100
  return Math.min(score, 100);
}

