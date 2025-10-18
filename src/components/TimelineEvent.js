"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "./Markdown";
import EditEventModal from "./EditEventModal";
import { getVerificationBadge } from "../lib/aiFactCheck";
import { reverifyEvent } from "../lib/firestoreService";
import { isAdmin } from "../lib/adminConfig";

function renderPreview(text, maxChars = 200) {
  if (!text) return "";
  const stripped = text.replace(/[#*_>`~\-\[\]\(\)]/g, "");
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars).trim() + "…";
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

export default function TimelineEvent({ event, currentUser, onEventUpdated }) {
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showVerificationTooltip, setShowVerificationTooltip] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [reverifyError, setReverifyError] = useState("");
  
  const disputed = event.status === 'disputed' || (Array.isArray(event.disputedClaims) && event.disputedClaims.length > 0);
  const ai = typeof event.aiScore === 'number' ? event.aiScore : 0;
  const comm = typeof event.communityScore === 'number' ? event.communityScore : 0;
  const final = typeof event.finalScore === 'number' ? event.finalScore : (0.7 * ai + 0.3 * comm);
  const pct = Math.round(final * 100);
  const color = pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500';
  
  const isAuthor = currentUser?.email && (event.addedBy === currentUser.email || event.author === currentUser.email);
  
  // Check if user is admin
  const userIsAdmin = isAdmin(currentUser);
  
  // Get AI verification badge
  const verificationBadge = getVerificationBadge(event.credibilityScore);

  // Handle re-verification
  async function handleReverify(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser) return;
    
    setReverifying(true);
    setReverifyError("");
    
    try {
      await reverifyEvent(event.id, currentUser);
      // Call parent callback to refresh event data
      if (onEventUpdated) {
        await onEventUpdated();
      }
    } catch (error) {
      console.error("Re-verification failed:", error);
      setReverifyError(error?.message || "Failed to re-verify event");
    } finally {
      setReverifying(false);
    }
  }

  return (
    <>
      <div className="group rounded-2xl border border-gray-800 bg-gray-900 hover:border-gold-primary shadow-lg hover:shadow-xl hover:shadow-gold-primary/20 hover:scale-[1.02] transition-all duration-300 overflow-hidden relative cursor-pointer"
        onClick={() => setDetailsModalOpen(true)}>
      {/* Optional Image */}
      {event.imageUrl && (
        <div className="relative w-full h-48 overflow-hidden bg-gray-950">
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      {/* Re-verifying Shimmer Overlay */}
      {reverifying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent z-10 pointer-events-none"
        >
          <motion.div
            className="h-full w-full bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      )}

      <div className="p-5">
        {/* Re-verification Error */}
        {reverifyError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30"
          >
            <p className="text-red-700 dark:text-red-400 text-xs font-medium">
              ❌ {reverifyError}
            </p>
          </motion.div>
        )}

        {/* Date and Category Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="px-3 py-1 bg-gold-primary/10 border border-gold-primary/30 rounded-lg">
            <span className="text-gold-secondary dark:text-gold-primary font-semibold text-xs">
              {formatDate(event.date)}
            </span>
          </div>
          {event.category && (
            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 font-medium text-[10px] uppercase tracking-wide">
                {event.category}
              </span>
            </div>
          )}
          {disputed && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-medium">
              ⚠️ Disputed
            </span>
          )}
          
          {/* AI Verification Badge */}
          {event.credibilityScore !== null && event.credibilityScore !== undefined && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onMouseEnter={() => setShowVerificationTooltip(true)}
              onMouseLeave={() => setShowVerificationTooltip(false)}
            >
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${verificationBadge.bgColor} border ${verificationBadge.borderColor} text-[10px] font-medium ${verificationBadge.textColor} cursor-help`}>
                <span>{verificationBadge.icon}</span>
                <span>{verificationBadge.text}</span>
                {event.manuallyVerified && (
                  <span title="Manually verified by admin">👤</span>
                )}
              </div>
              
              {/* Tooltip */}
              <AnimatePresence>
                {showVerificationTooltip && event.verifiedSummary && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 left-0 top-full mt-2 w-72 p-3 rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      <div className="font-semibold mb-1 text-gold-primary">AI Fact-Check Summary:</div>
                      <p className="leading-relaxed">{event.verifiedSummary}</p>
                      {event.aiSources && event.aiSources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="font-semibold mb-1">Suggested Sources:</div>
                          <ul className="space-y-1">
                            {event.aiSources.map((source, idx) => (
                              <li key={idx}>
                                <a
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gold-primary hover:text-gold-secondary underline break-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {source}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Title with Edit Button */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/event/${event.id}`} className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-gold-primary transition-colors line-clamp-2">
              {event.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            {/* Admin Re-Verify Button */}
            {userIsAdmin && (
              <motion.button
                onClick={handleReverify}
                disabled={reverifying}
                className="px-3 py-1 text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!reverifying ? { scale: 1.05 } : {}}
                whileTap={!reverifying ? { scale: 0.95 } : {}}
                title="Re-run AI fact-check (Admin)"
              >
                {reverifying ? (
                  <span className="flex items-center gap-1">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      🔄
                    </motion.span>
                    Re-verifying...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    🔍 Re-Verify
                  </span>
                )}
              </motion.button>
            )}
            {/* Author Edit Button */}
            {isAuthor && (
              <motion.button
                onClick={() => setEditModalOpen(true)}
                className="px-3 py-1 text-xs font-medium bg-gold-primary/10 border border-gold-primary/30 text-gold-primary hover:bg-gold-primary/20 rounded-lg transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Edit
              </motion.button>
            )}
          </div>
        </div>

        {/* Digest Summary - AI-generated short version or fallback */}
        <p className="text-sm text-gray-300 leading-relaxed mb-4">
          {event.shortSummary || renderPreview(event.summary || event.description, 150) + '…'}
        </p>

        {/* Location & Source Badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>{event.location}</span>
            </div>
          )}
          {event.sources && event.sources.length > 0 && (
            <div className="text-xs text-gray-500">
              <span>{event.sources.length} source{event.sources.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            setDetailsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gold-primary hover:bg-gold-secondary border border-gold-primary hover:border-gold-secondary rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>View Details</span>
          <motion.svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </motion.svg>
        </motion.button>
      </div>
    </div>

    {/* Details Modal */}
    <AnimatePresence>
      {detailsModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDetailsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-start justify-between z-10">
              <div className="flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="px-3 py-1 bg-gold-primary/10 border border-gold-primary/30 rounded-lg">
                    <span className="text-gold-primary font-semibold text-xs">{formatDate(event.date)}</span>
                  </div>
                  {event.category && (
                    <div className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg">
                      <span className="text-gray-300 font-medium text-[10px] uppercase tracking-wide">{event.category}</span>
                    </div>
                  )}
                  {event.credibilityScore !== null && event.credibilityScore !== undefined && (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${verificationBadge.bgColor} border ${verificationBadge.borderColor} text-[10px] font-medium ${verificationBadge.textColor}`}>
                      <span>{verificationBadge.icon}</span>
                      <span>{verificationBadge.text}</span>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">{event.title}</h2>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="flex-shrink-0 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-300"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Image */}
              {event.imageUrl && (
                <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden">
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                <div className="text-gray-300 leading-relaxed">
                  <Markdown>{event.summary || event.description}</Markdown>
                </div>
              </div>

              {/* Enriched Sections */}
              {event.background && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-2">Background</h3>
                      <p className="text-gray-300 leading-relaxed">{event.background}</p>
                    </div>
                  </div>
                </div>
              )}

              {event.keyFigures && Array.isArray(event.keyFigures) && event.keyFigures.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-3">Key Figures</h3>
                      <ul className="space-y-2">
                        {event.keyFigures.map((figure, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-300">
                            <span className="text-gold-primary mt-1">•</span>
                            <span>{figure}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {event.causes && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-2">Causes</h3>
                      <p className="text-gray-300 leading-relaxed">{event.causes}</p>
                    </div>
                  </div>
                </div>
              )}

              {event.outcomes && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-2">Outcomes</h3>
                      <p className="text-gray-300 leading-relaxed">{event.outcomes}</p>
                    </div>
                  </div>
                </div>
              )}

              {event.impact && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-2">Long-term Impact</h3>
                      <p className="text-gray-300 leading-relaxed">{event.impact}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sources Section */}
              {event.sources && Array.isArray(event.sources) && event.sources.length > 0 && (
                <div className="bg-gray-800/50 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gold-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gold-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white uppercase tracking-wide mb-3">Sources</h3>
                      <ul className="space-y-3">
                        {event.sources.map((source, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-gold-primary font-medium flex-shrink-0">{idx + 1}.</span>
                            <div>
                              <a
                                href={typeof source === 'string' ? source : source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold-primary hover:text-gold-secondary transition-colors duration-300 underline break-all"
                              >
                                {typeof source === 'string' ? source : (source.name || source.url)}
                              </a>
                              {typeof source === 'object' && source.name && source.url && (
                                <div className="text-xs text-gray-500 mt-1 break-all">{source.url}</div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800">
                <Link 
                  href={`/event/${event.id}`}
                  className="text-gold-primary hover:text-gold-secondary transition-colors duration-300 text-sm font-medium"
                >
                  View full page →
                </Link>
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Edit Modal */}
    <EditEventModal 
      event={event}
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      onSuccess={onEventUpdated}
    />
    </>
  );
}


