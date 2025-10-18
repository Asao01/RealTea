"use client";

import { motion } from "framer-motion";

/**
 * Loading Skeleton Component
 * Shows shimmer effect while content loads
 */
export function SkeletonCard({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] p-5 animate-pulse"
        >
          {/* Header */}
          <div className="flex gap-2 mb-3">
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>

          {/* Title */}
          <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-3" />

          {/* Description */}
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>

          {/* Footer */}
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </>
  );
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, idx) => (
        <div
          key={idx}
          className={`h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse ${
            idx === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-16 h-16 border-4",
  };

  return (
    <motion.div
      className={`${sizes[size]} border-gold-primary border-t-transparent rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

export function LoadingOverlay({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-800">
        <LoadingSpinner size="lg" className="mb-4 mx-auto" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}

