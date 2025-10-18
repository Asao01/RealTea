"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

/**
 * AI Status Indicator
 * Shows when AI has just uploaded new verified content
 */
export default function AIStatusIndicator() {
  const [lastAIAction, setLastAIAction] = useState(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (!db) return;

    // Listen to system logs for AI actions
    const logsRef = collection(db, 'system_logs');
    const logsQuery = query(
      logsRef,
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      if (snapshot.empty) return;

      const latestLog = snapshot.docs[0].data();
      
      if (latestLog.performedBy === 'realtea-ai') {
        setLastAIAction(latestLog);
        setShowBadge(true);

        // Auto-hide after 30 seconds
        setTimeout(() => setShowBadge(false), 30000);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showBadge || !lastAIAction) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-full px-6 py-3 shadow-2xl border border-green-500/30"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping"></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-400">
              AI Verified Just Now
            </span>
            <span className="text-xs text-gray-400">
              ✅ {lastAIAction.actionType?.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={() => setShowBadge(false)}
            className="ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

