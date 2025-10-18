"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import env from "../lib/env";

export default function DevEnvBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    if (!env.isDevelopment) return;
    
    const envProblems = env.getProblems();
    setProblems(envProblems);
    
    // Check localStorage for dismissal
    const dismissedKey = 'realtea-env-banner-dismissed';
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('realtea-env-banner-dismissed', 'true');
  };

  if (!env.isDevelopment || dismissed || problems.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-red-900 border-b-2 border-red-600 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Missing Environment Variables
                </p>
                <p className="text-xs text-red-200">
                  {problems.length} required variable{problems.length > 1 ? 's' : ''} missing: {problems.map(p => p.varName.replace('NEXT_PUBLIC_FIREBASE_', '')).join(', ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href="/.env.example"
                download
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded transition-colors"
              >
                Download Template
              </a>
              <button
                onClick={handleDismiss}
                className="p-1 text-red-200 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

