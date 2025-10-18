"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function BreakingNewsTicker() {
  const [breakingEvents, setBreakingEvents] = useState([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Query for breaking news events
    const eventsRef = collection(db, 'events');
    const breakingQuery = query(
      eventsRef,
      where('isBreaking', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    // Real-time listener
    const unsubscribe = onSnapshot(breakingQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Breaking News',
          url: data.url || data.verifiedSource || '#',
          createdAt: data.createdAt,
          // Check if within 24 hours
          isRecent: data.createdAt && 
            (Date.now() - data.createdAt.toDate().getTime()) < 24 * 60 * 60 * 1000
        };
      });

      setBreakingEvents(events.slice(0, 5));
      console.log(`🔴 [TICKER] Loaded ${events.length} breaking news items`);
    });

    return () => unsubscribe();
  }, []);

  if (breakingEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-b-2 border-red-600 shadow-lg">
      <div className="flex items-center h-10 overflow-hidden">
        {/* LIVE Badge */}
        <div className="flex-shrink-0 px-4 flex items-center gap-2">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            <span className="text-white font-bold text-sm tracking-wider">
              LIVE
            </span>
          </motion.div>
          <div className="w-px h-6 bg-red-400/50" />
        </div>

        {/* Scrolling Ticker */}
        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex gap-8 whitespace-nowrap"
            animate={{ x: [0, -1000] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear",
              },
            }}
          >
            {/* Duplicate for infinite scroll effect */}
            {[...breakingEvents, ...breakingEvents, ...breakingEvents].map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className="flex items-center gap-3"
              >
                {event.isRecent && (
                  <motion.span
                    animate={{ 
                      opacity: [1, 0.5, 1],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity 
                    }}
                    className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded"
                  >
                    NEW
                  </motion.span>
                )}
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-yellow-300 transition-colors text-sm font-medium"
                >
                  {event.title}
                </a>
                <span className="text-red-300">•</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsLive(false)}
          className="flex-shrink-0 px-4 text-white/70 hover:text-white transition-colors"
          aria-label="Close ticker"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

