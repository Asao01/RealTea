"use client";

import { motion } from "framer-motion";

/**
 * Trust Badge Component
 * Displays achievement badges based on user stats
 */
export default function TrustBadge({ trustScore, verifiedActions = 0, recentActivity = 0 }) {
  const badges = [];

  // Reliable Contributor Badge (trustScore >= 85)
  if (trustScore >= 85) {
    badges.push({
      icon: '🟩',
      label: 'Reliable Contributor',
      color: '#00ffaa',
      description: 'Consistent high-quality contributions'
    });
  }

  // Active Verifier Badge (>= 20 verified actions in 7 days)
  if (recentActivity >= 20) {
    badges.push({
      icon: '🟨',
      label: 'Active Verifier',
      color: '#ffd166',
      description: '20+ verified actions this week'
    });
  }

  // Under Review Badge (trustScore < 25)
  if (trustScore < 25) {
    badges.push({
      icon: '🟥',
      label: 'Under Review',
      color: '#e63946',
      description: 'Account under moderation review'
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="inline-flex items-center gap-1">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="group relative"
        >
          <div 
            className="w-5 h-5 rounded flex items-center justify-center cursor-help"
            style={{ 
              backgroundColor: `${badge.color}20`,
              border: `1px solid ${badge.color}40`
            }}
          >
            <span className="text-xs">{badge.icon}</span>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div 
              className="bg-[#0b0b0b] border-2 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
              style={{ borderColor: badge.color }}
            >
              <div className="text-xs font-bold" style={{ color: badge.color }}>
                {badge.label}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {badge.description}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Simple badge for inline display
 */
export function TrustBadgeSimple({ trustScore }) {
  if (trustScore >= 85) {
    return <span className="text-xs">🟩</span>;
  }
  if (trustScore < 25) {
    return <span className="text-xs">🟥</span>;
  }
  return null;
}

