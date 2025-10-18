"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function RecentEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch 5 most recent events
  const fetchRecentEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🏠 [HOME] Fetching 5 most recent events...");
      
      if (!db) {
        throw new Error("Firestore not initialized");
      }
      
      // Get 5 most recent events
      const eventsRef = collection(db, "events");
      const recentQuery = query(eventsRef, orderBy("createdAt", "desc"), limit(5));
      const querySnapshot = await getDocs(recentQuery);
      
      const fetchedEvents = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Check if event is breaking (title contains keywords)
        const breakingKeywords = ['breaking', 'urgent', 'alert'];
        const titleLower = (data.title || '').toLowerCase();
        const isBreaking = breakingKeywords.some(keyword => titleLower.includes(keyword)) || data.isBreaking;
        
        return {
          id: doc.id,
          title: data.title || "Untitled Event",
          description: data.description || "No description available.",
          date: data.date || "",
          year: data.date ? data.date.split('-')[0] : new Date().getFullYear().toString(),
          category: data.category || "News",
          imageUrl: data.imageUrl || "",
          location: data.location || "",
          verifiedSource: data.verifiedSource || "",
          addedBy: data.addedBy || data.author || "Unknown",
          aiGenerated: data.aiGenerated || false,
          newsGenerated: data.newsGenerated || false,
          isBreaking: isBreaking,
          createdAt: data.createdAt
        };
      });
      
      console.log(`✅ [HOME] Loaded ${fetchedEvents.length} recent events`);
      console.log(`🔥 [HOME] Breaking events: ${fetchedEvents.filter(e => e.isBreaking).length}`);
      
      setEvents(fetchedEvents);
      setLoading(false);
    } catch (err) {
      console.error("❌ [HOME] Error fetching recent events:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchRecentEvents();
    
    // Auto-refresh every 60 seconds to catch new events
    const refreshInterval = setInterval(() => {
      console.log("🔄 [HOME] Auto-refreshing recent events...");
      fetchRecentEvents();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <section className="py-24 px-4 bg-[#0b0b0b]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <motion.div
                className="inline-block h-16 w-16 rounded-full border-4 border-t-transparent border-[#D4AF37]"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <p className="mt-6 text-lg text-gray-400 font-medium">
                Loading recent events...
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-24 px-4 bg-[#0b0b0b]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-400">Unable to load recent events</p>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="py-24 px-4 bg-[#0b0b0b]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-400">No recent events yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-4 bg-[#0b0b0b]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
            Recent & Urgent Stories
          </h2>
          <p className="text-xl text-gray-400">
            Latest {events.length} events from the timeline
          </p>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mt-6" />
        </motion.div>

        {/* Events Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.5 }}
              className="group relative bg-[#1a1a1a] rounded-xl p-6 shadow-lg hover:shadow-2xl hover:shadow-[#D4AF37]/10 transition-all duration-500"
            >
              {/* Breaking banner (if breaking) */}
              {event.isBreaking && (
                <div className="absolute -top-3 -right-3 z-10">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full shadow-lg shadow-yellow-500/50 flex items-center gap-1"
                  >
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-bold text-black">Breaking</span>
                  </motion.div>
                </div>
              )}

              {/* Gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-[#E5C878] rounded-t-xl" />

              {/* Image */}
              {event.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden -mx-6 -mt-6 pt-1">
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded text-[#D4AF37] text-xs font-semibold uppercase">
                  {event.category}
                </span>
                {event.newsGenerated && (
                  <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-xs font-semibold flex items-center gap-1">
                    <span>📰</span>
                    <span>News</span>
                  </span>
                )}
                {event.aiGenerated && !event.newsGenerated && (
                  <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 text-xs font-semibold flex items-center gap-1">
                    <span>✨</span>
                    <span>AI</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-[#e5e5e5] mb-2 group-hover:text-[#D4AF37] transition-colors duration-300">
                {event.title}
              </h3>

              {/* Year */}
              <p className="text-[#D4AF37] font-semibold text-sm mb-3">
                {event.date || event.year}
              </p>

              {/* Description */}
              <p className="text-gray-400 leading-relaxed mb-4 line-clamp-3">
                {event.description}
              </p>

              {/* Location */}
              {event.location && event.location !== 'Unknown' && (
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>{event.location}</span>
                </p>
              )}

              {/* Source */}
              {event.verifiedSource && (
                <a
                  href={event.verifiedSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#D4AF37] hover:text-[#E5C878] flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>View Source</span>
                </a>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/timeline"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4AF37] text-[#0b0b0b] font-bold text-lg rounded-xl hover:bg-[#E5C878] shadow-lg hover:shadow-[#D4AF37]/50 transition-all duration-300"
          >
            <span>View Full Timeline</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

