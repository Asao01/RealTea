"use client";

import { motion } from "framer-motion";
import { getCredibilityBadge, getSourceTransparency } from "../lib/credibilityScore";

export default function CredibilityBadge({ event, showDetails = false }) {
  const score = event.credibilityScore || 0;
  const badge = getCredibilityBadge(score);
  const sourceBadges = getSourceTransparency(event);

  return (
    <div className="space-y-2">
      {/* Main Credibility Score */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
        style={{
          backgroundColor: `${badge.color}20`,
          borderColor: badge.color,
          color: badge.color
        }}
      >
        <span className="text-sm">{badge.icon}</span>
        <div className="flex flex-col">
          <span className="text-xs font-bold">{badge.label}</span>
          <span className="text-xs opacity-75">Score: {score}/100</span>
        </div>
      </motion.div>

      {/* Source Transparency Badges */}
      {showDetails && sourceBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sourceBadges.map((srcBadge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
              style={{
                backgroundColor: `${srcBadge.color}15`,
                borderColor: `${srcBadge.color}40`,
                color: srcBadge.color
              }}
            >
              <span>{srcBadge.icon}</span>
              <span>{srcBadge.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Credibility Bar */}
      {showDetails && (
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${score < 50 ? '#e63946' : score < 70 ? '#ffd166' : '#00ffaa'}, ${badge.color})`
            }}
          />
        </div>
      )}
    </div>
  );
}

