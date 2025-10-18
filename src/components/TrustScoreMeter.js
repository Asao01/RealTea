"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Trust Score Meter Component
 * Displays user reputation with visual indicator
 * 
 * Levels:
 * - 70-100: Highly Trusted (Green)
 * - 40-69:  Neutral (Yellow)
 * - 0-39:   Low Trust (Red)
 */
export default function TrustScoreMeter({ score = 50, size = "sm", showTooltip = true, showScore = false }) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine color and level based on score
  const getTrustLevel = (score) => {
    if (score >= 70) return { 
      level: 'Highly Trusted', 
      color: '#00ffaa', 
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500'
    };
    if (score >= 40) return { 
      level: 'Neutral', 
      color: '#ffd166', 
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500'
    };
    return { 
      level: 'Low Trust', 
      color: '#e63946', 
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500'
    };
  };

  const trustLevel = getTrustLevel(score);

  // Size variants
  const sizes = {
    xs: { circle: 'w-4 h-4', bar: 'h-1 w-12' },
    sm: { circle: 'w-5 h-5', bar: 'h-1.5 w-16' },
    md: { circle: 'w-6 h-6', bar: 'h-2 w-20' },
    lg: { circle: 'w-8 h-8', bar: 'h-3 w-24' }
  };

  const sizeClasses = sizes[size] || sizes.sm;

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Circle Indicator */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`${sizeClasses.circle} rounded-full border-2 ${trustLevel.borderColor} ${trustLevel.bgColor} flex items-center justify-center cursor-help`}
          style={{ boxShadow: `0 0 10px ${trustLevel.color}40` }}
        >
          {/* Fill indicator */}
          <div
            className={`${size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full`}
            style={{ backgroundColor: trustLevel.color }}
          />
        </motion.div>

        {/* Tooltip */}
        {showTooltip && (
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 pointer-events-none"
              >
                <div className="bg-[#0b0b0b] border-2 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
                     style={{ borderColor: trustLevel.color }}>
                  <div className="text-xs font-bold mb-1" style={{ color: trustLevel.color }}>
                    {trustLevel.level}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Trust Score: {score}/100
                  </div>
                  <div className="text-xs text-gray-500">
                    Based on verified contributions
                  </div>
                  {/* Arrow */}
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px"
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${trustLevel.color}`
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Optional: Show score number */}
      {showScore && (
        <span className="text-xs font-medium" style={{ color: trustLevel.color }}>
          {score}
        </span>
      )}
    </div>
  );
}

/**
 * Trust Score Bar (alternative display)
 */
export function TrustScoreBar({ score = 50, showLabel = true }) {
  const getTrustLevel = (score) => {
    if (score >= 70) return { level: 'Highly Trusted', color: '#00ffaa' };
    if (score >= 40) return { level: 'Neutral', color: '#ffd166' };
    return { level: 'Low Trust', color: '#e63946' };
  };

  const trustLevel = getTrustLevel(score);

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-xs text-gray-400 min-w-[80px]">Trust Score:</span>
      )}
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden min-w-[100px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: trustLevel.color }}
        />
      </div>
      <span className="text-xs font-medium min-w-[60px]" style={{ color: trustLevel.color }}>
        {score}/100
      </span>
    </div>
  );
}

