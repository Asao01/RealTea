"use client";

import { motion } from "framer-motion";

/**
 * Simple inline verification badge component
 * Shows credibility score and summary in a compact format
 */
export default function VerificationBadge({ event, showSummary = true }) {
  // Don't show anything if no credibility score
  if (event.credibilityScore === null || event.credibilityScore === undefined) {
    return null;
  }

  const score = event.credibilityScore;

  // Determine badge style based on score
  const getBadgeStyle = () => {
    if (score >= 70) {
      return {
        color: "text-[#D4AF37]",
        icon: "✅",
        label: "Verified by AI",
      };
    } else if (score >= 40) {
      return {
        color: "text-yellow-500",
        icon: "⚠️",
        label: "Needs Review",
      };
    } else {
      return {
        color: "text-red-500",
        icon: "❌",
        label: "Unverified",
      };
    }
  };

  const badge = getBadgeStyle();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-2"
    >
      {/* Score Badge */}
      <p className="text-sm">
        <span className={`${badge.color} font-semibold`}>
          {badge.icon} {badge.label} ({score}%)
        </span>
        {event.manuallyVerified && (
          <span className="ml-2 text-xs opacity-75" title="Manually verified by admin">
            👤
          </span>
        )}
      </p>

      {/* AI Summary */}
      {showSummary && event.verifiedSummary && (
        <p className="text-xs mt-1 italic opacity-80 text-gray-600 dark:text-gray-400 leading-relaxed">
          {event.verifiedSummary}
        </p>
      )}

      {/* AI Sources (optional, collapsed by default) */}
      {showSummary && event.aiSources && event.aiSources.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 dark:text-gray-500 cursor-pointer hover:text-gold-primary">
            View {event.aiSources.length} suggested source{event.aiSources.length !== 1 ? 's' : ''}
          </summary>
          <ul className="mt-1 ml-4 space-y-1">
            {event.aiSources.map((source, idx) => (
              <li key={idx}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold-primary hover:text-gold-secondary underline break-all"
                >
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </motion.div>
  );
}

