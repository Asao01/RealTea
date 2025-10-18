"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

/**
 * Enhanced EventCard Component
 * Supports multiple variants: default, hero, secondary, compact
 */
export default function EventCard({ event, variant = "default" }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Safe event property access with fallbacks
  const safeEvent = {
    id: event?.id || 'unknown',
    title: event?.headline || event?.title || "Untitled Event",
    description: event?.description || event?.summary || "No description available.",
    date: event?.date || event?.seendate || new Date().toISOString(),
    location: event?.location || event?.sourcecountry || "",
    category: event?.category || "World",
    imageUrl: event?.imageUrl || event?.socialimage || event?.image || "",
    credibilityScore: event?.credibilityScore ?? 70,
    importanceScore: event?.importanceScore ?? 60,
    verifiedSource: event?.verifiedSource || event?.url || "",
    source: event?.source || (event?.domain ? { name: event.domain } : null),
    aiSummary: event?.aiSummary || "",
    verified: event?.verified ?? false,
    rankScore: event?.rankScore
  };

  // Format date helper with better error handling
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate();
      const month = date.toLocaleString('en', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (error) {
      return dateString;
    }
  }

  // Get credibility color
  function getCredibilityColor(score) {
    const numScore = Number(score) || 0;
    if (numScore >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (numScore >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }

  // Variant-specific classes
  const variantClasses = {
    hero: "h-[500px]",
    secondary: "h-[240px]",
    compact: "h-[320px]",
    default: "h-[380px]"
  };

  const titleClasses = {
    hero: "text-3xl md:text-4xl",
    secondary: "text-lg",
    compact: "text-lg",
    default: "text-xl"
  };

  const descriptionLines = {
    hero: "line-clamp-3",
    secondary: "line-clamp-2",
    compact: "line-clamp-2",
    default: "line-clamp-3"
  };

  // Early return if no event
  if (!event) {
    return (
      <div className="card h-[380px] flex items-center justify-center">
        <p className="text-gray-500">Loading event...</p>
      </div>
    );
  }

  return (
    <Link href={`/event/${safeEvent.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.3 }}
        className={`card hover-lift cursor-pointer overflow-hidden relative group ${variantClasses[variant] || variantClasses.default}`}
      >
        {/* Background Image */}
        {safeEvent.imageUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={safeEvent.imageUrl}
              alt={safeEvent.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'blur-load loaded' : 'blur-load'
              } group-hover:scale-110`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/80 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-6">
          {/* Badges Row */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Category Badge */}
            {safeEvent.category && (
              <span className="badge badge-category text-xs">
                {safeEvent.category}
              </span>
            )}

            {/* Verified Badge */}
            {(safeEvent.verifiedSource || safeEvent.credibilityScore >= 85) && (
              <span className="badge badge-verified text-xs">
                ✓ Verified
              </span>
            )}

            {/* AI Analyzed Badge */}
            {safeEvent.aiSummary && (
              <span className="badge bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                AI Analyzed
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`font-display font-bold text-white mb-2 ${titleClasses[variant] || titleClasses.default} text-shadow`}>
            {safeEvent.title}
          </h3>

          {/* Date & Location */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
            {safeEvent.date && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(safeEvent.date)}
              </span>
            )}
            {safeEvent.location && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {safeEvent.location}
              </span>
            )}
          </div>

          {/* Description (only for default and hero) */}
          {variant !== "secondary" && variant !== "compact" && safeEvent.description && (
            <p className={`text-gray-300 text-sm mb-4 ${descriptionLines[variant] || descriptionLines.default}`}>
              {safeEvent.aiSummary || safeEvent.description}
            </p>
          )}

          {/* Footer: Credibility & Source */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-700/50">
            {/* Credibility Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Credibility:</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${safeEvent.credibilityScore}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                  />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getCredibilityColor(safeEvent.credibilityScore)}`}>
                  {safeEvent.credibilityScore}
                </span>
              </div>
            </div>

            {/* Source */}
            {safeEvent.source?.name && (
              <span className="text-xs text-gray-500">
                via {safeEvent.source.name}
              </span>
            )}
          </div>

          {/* Hover Indicator */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rank Score Badge (if present) */}
        {safeEvent.rankScore !== undefined && variant === "default" && (
          <div className="absolute bottom-4 right-4 z-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="w-12 h-12 rounded-full glass-strong flex items-center justify-center border border-[#D4AF37]/30"
            >
              <span className="text-[#D4AF37] font-bold text-sm">
                {safeEvent.rankScore.toFixed(0)}
              </span>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
