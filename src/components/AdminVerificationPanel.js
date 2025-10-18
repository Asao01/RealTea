"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { reverifyEvent, manuallyVerifyEvent } from "../lib/firestoreService";
import { getVerificationBadge } from "../lib/aiFactCheck";
import { isAdmin } from "../lib/adminConfig";

/**
 * Admin panel for managing event verification
 * Allows admins to re-run AI fact-checks or manually override verification
 */
export default function AdminVerificationPanel({ event, currentUser, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Manual override state
  const [manualScore, setManualScore] = useState(event.credibilityScore || 50);
  const [manualSummary, setManualSummary] = useState(event.verifiedSummary || "");

  const badge = getVerificationBadge(event.credibilityScore);
  
  // Only render if user is admin
  if (!isAdmin(currentUser)) {
    return null;
  }

  async function handleReverify() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await reverifyEvent(event.id, currentUser);
      setSuccess(`Event re-verified! New score: ${result.credibilityScore}%`);
      onUpdate?.();
    } catch (err) {
      setError(err?.message || "Failed to re-verify event");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualOverride(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await manuallyVerifyEvent(
        event.id,
        {
          credibilityScore: manualScore,
          verifiedSummary: manualSummary,
        },
        currentUser
      );
      setSuccess(`Manual verification applied! Score: ${manualScore}%`);
      onUpdate?.();
      setIsOpen(false);
    } catch (err) {
      setError(err?.message || "Failed to apply manual verification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            🔐 Admin: Verification Controls
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage AI fact-checking for this event
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Status:</span>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${badge.bgColor} border ${badge.borderColor} text-[10px] font-medium ${badge.textColor}`}>
            <span>{badge.icon}</span>
            <span>{badge.text}</span>
            {event.manuallyVerified && <span title="Manually verified">👤</span>}
          </div>
        </div>
        
        {event.verifiedSummary && (
          <div className="text-xs text-gray-700 dark:text-gray-300 mt-2">
            <span className="font-semibold">Summary:</span> {event.verifiedSummary}
          </div>
        )}
        
        {event.factCheckedAt && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Last checked: {new Date(event.factCheckedAt).toLocaleString()}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <motion.button
          onClick={handleReverify}
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {loading ? "⏳ Re-verifying..." : "🔄 Re-run AI Fact-Check"}
        </motion.button>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs font-medium bg-gold-primary hover:bg-gold-secondary text-bg-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {isOpen ? "❌ Cancel Manual Override" : "✏️ Manual Override"}
        </motion.button>
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-700 dark:text-red-400 text-xs font-medium">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-500/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-green-700 dark:text-green-400 text-xs font-medium">{success}</p>
        </motion.div>
      )}

      {/* Manual Override Form */}
      {isOpen && (
        <motion.form
          onSubmit={handleManualOverride}
          className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3">
            Manual Verification Override
          </h4>

          {/* Credibility Score Slider */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Credibility Score: <span className="font-bold text-gold-primary">{manualScore}%</span>
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={manualScore}
              onChange={(e) => setManualScore(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gold-primary"
            />
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-500 mt-1">
              <span>❌ Unverified</span>
              <span>⚠️ Needs Review</span>
              <span>✅ Verified</span>
            </div>
          </div>

          {/* Summary Text Area */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Verification Summary
            </label>
            <textarea
              value={manualSummary}
              onChange={(e) => setManualSummary(e.target.value)}
              rows={4}
              required
              className="w-full rounded-lg border px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary"
              placeholder="Explain why you're setting this credibility score..."
            />
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !manualSummary.trim()}
            className="w-full px-4 py-2 text-xs font-medium bg-gold-primary hover:bg-gold-secondary text-bg-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            whileHover={!loading && manualSummary.trim() ? { scale: 1.02 } : {}}
            whileTap={!loading && manualSummary.trim() ? { scale: 0.98 } : {}}
          >
            {loading ? "⏳ Applying..." : "✅ Apply Manual Verification"}
          </motion.button>
        </motion.form>
      )}

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <span className="font-semibold">Note:</span> Manual overrides will be marked with a 👤 icon. 
          Re-running AI fact-check will replace any manual override.
        </p>
      </div>
    </div>
  );
}

