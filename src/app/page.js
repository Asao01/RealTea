"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import EventCard from "../components/EventCard";
import Footer from "../components/Footer";
import ErrorBoundary from "../components/ErrorBoundary";
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { rankAndSortEvents, getHomepageEvents } from "../lib/rankUtils";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    console.log('🏠 [HOME] Setting up real-time listener...');

    if (!db) {
      console.error('❌ [HOME] Firestore not initialized');
      setLoading(false);
      return;
    }

    // Real-time query: Fetch events ordered by rank score
    const eventsRef = collection(db, 'events');
    
    // Fetch top 100 recent events for better coverage
    const recentQuery = query(
      eventsRef,
      orderBy('createdAt', 'desc'),
      limit(100) // Increased from 50 to 100 for more comprehensive feed
    );

    // Subscribe to real-time updates with error handling
    const unsubscribe = onSnapshot(
      recentQuery,
      (snapshot) => {
        console.log(`🔄 [HOME] Real-time update: ${snapshot.docs.length} events received`);
        
        const fetchedEvents = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Comprehensive data mapping with GDELT support - works even if fields are missing
          return {
            id: doc.id,
            title: data?.headline || data?.title || 'Untitled Event',
            description: data?.description || data?.summary || 'No description available',
            category: data?.category || 'World',
            location: data?.location || data?.sourcecountry || '',
            year: data?.year || (data?.date ? data.date.split('-')[0] : (data?.seendate ? data.seendate.substring(0, 4) : new Date().getFullYear().toString())),
            date: data?.date || data?.seendate || new Date().toISOString().split('T')[0],
            imageUrl: data?.imageUrl || data?.socialimage || '',
            verifiedSource: data?.verifiedSource || data?.url || '',
            urgency: data?.urgency || 0,
            isBreaking: data?.isBreaking || false,
            newsGenerated: data?.newsGenerated || false,
            aiGenerated: data?.aiGenerated || false,
            source: data?.source || (data?.domain ? { name: data.domain } : {}),
            addedBy: data?.addedBy || data?.author || data?.domain || 'Unknown',
            credibilityScore: data?.credibilityScore ?? 70,
            importanceScore: data?.importanceScore ?? 60,
            upvotes: data?.upvotes || 0,
            downvotes: data?.downvotes || 0,
            verified: data?.verified ?? false,
            contested: data?.contested || false,
            createdAt: data?.createdAt || null
          };
        });

        // Remove duplicates by title (keep highest credibility)
        // Use strict deduplication to ensure ALL headlines are different
        const seenTitles = new Map();
        const uniqueEvents = [];
        
        fetchedEvents.forEach(event => {
          const titleKey = event.title.toLowerCase().trim();
          const existing = seenTitles.get(titleKey);
          
          if (!existing) {
            seenTitles.set(titleKey, event);
            uniqueEvents.push(event);
          } else {
            // Keep the one with higher credibility
            if (event.credibilityScore > existing.credibilityScore) {
              console.log(`🔄 [HOME] Replaced duplicate: ${event.title} (score ${existing.credibilityScore} → ${event.credibilityScore})`);
              // Remove old from uniqueEvents
              const index = uniqueEvents.findIndex(e => e.id === existing.id);
              if (index !== -1) uniqueEvents[index] = event;
              seenTitles.set(titleKey, event);
            } else {
              console.log(`⏭️  [HOME] Skipped duplicate: ${event.title}`);
            }
          }
        });
        
        console.log(`✅ [HOME] Deduplicated: ${fetchedEvents.length} → ${uniqueEvents.length} unique events`);

        // Filter for recent (past 7 days) or breaking news, AND credible (score >= 60)
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const recentOrBreaking = uniqueEvents.filter(event => {
          // Must be credible (score >= 60)
          const isCredible = (event.credibilityScore || 0) >= 60;
          if (!isCredible) return false;
          
          // Breaking news always included
          if (event.isBreaking) return true;
          
          // Or recent (past 7 days)
          if (!event.createdAt) return false;
          const eventTime = event.createdAt.toDate().getTime();
          const age = Date.now() - eventTime;
          return age < sevenDaysMs;
        });

        console.log(`📅 [HOME] Filtered to recent/breaking + credible: ${uniqueEvents.length} → ${recentOrBreaking.length} events`);
        
        // Log unique titles for verification
        const titles = new Set(recentOrBreaking.map(e => e.title));
        console.log(`📝 [HOME] Unique headlines: ${titles.size}`);

        // Sort by: Breaking → Credibility → Recency
        const sortedEvents = recentOrBreaking.sort((a, b) => {
          // Breaking events first
          if (a.isBreaking && !b.isBreaking) return -1;
          if (!a.isBreaking && b.isBreaking) return 1;
          // Then by credibility score
          if (b.credibilityScore !== a.credibilityScore) {
            return b.credibilityScore - a.credibilityScore;
          }
          // Finally by recency (newest first)
          return 0; // Already sorted by createdAt from query
        });

        // Calculate ranking score: createdAt weight + credibilityScore + importanceScore
        const rankedEvents = sortedEvents.map(event => {
          const recencyScore = event.createdAt ? 
            Math.max(0, 100 - ((Date.now() - event.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))) : 0; // decay over days
          const credibility = event.credibilityScore || 50;
          const importance = event.importanceScore || 50;
          const breakingBonus = event.isBreaking ? 50 : 0;
          
          // Weighted formula: recency (40%) + credibility (30%) + importance (20%) + breaking bonus
          const rankScore = (recencyScore * 0.4) + (credibility * 0.3) + (importance * 0.2) + breakingBonus;
          
          return { ...event, rankScore };
        });
        
        // Sort by rank score and show top 10
        const topEvents = rankedEvents
          .sort((a, b) => b.rankScore - a.rankScore)
          .slice(0, 10);

        console.log(`✅ [HOME] Real-time update: ${fetchedEvents.length} events fetched, ${topEvents.length} displayed`);
        console.log(`🔥 [HOME] Breaking events: ${topEvents.filter(e => e.isBreaking).length}`);
        console.log(`📊 [HOME] Event breakdown:`, {
          news: topEvents.filter(e => e.newsGenerated).length,
          ai: topEvents.filter(e => e.aiGenerated && !e.newsGenerated).length,
          manual: topEvents.filter(e => !e.aiGenerated).length
        });
        console.log(`📋 [HOME] Showing top ${topEvents.length} most relevant events ranked by credibility, importance & recency`);
        
        setEvents(topEvents);
        setLastUpdated(new Date());
        setLoading(false);
      },
      (error) => {
        console.error('❌ [HOME] Snapshot error:', error);
        console.error('📋 [HOME] Error details:', {
          code: error.code,
          message: error.message,
          name: error.name
        });
        
        // Show helpful error messages
        if (error.code === 'failed-precondition') {
          console.error('💡 [HOME] Firestore index required. Check Firebase Console for index creation link.');
        } else if (error.code === 'permission-denied') {
          console.error('💡 [HOME] Firestore read permission denied. Check firestore.rules.');
        }
        
        setLoading(false);
      }
    );

    // Auto-refresh every 15 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      console.log('🔄 [HOME] Auto-refresh triggered');
      // onSnapshot already handles real-time updates, this is just a heartbeat
    }, 15000); // 15 seconds

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  // Calculate "updated X minutes ago"
  const getTimeAgo = () => {
    if (!lastUpdated) return '';
    
    const minutes = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <ErrorBoundary errorMessage="Unable to load the homepage. Please try again.">
      <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <section className="relative py-12 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
              📰 Latest Verified Events
            </h1>
            <p className="text-lg text-gray-400 mb-2">
              10 Most Recent Verified Events - Live Updates Every 15 Seconds
            </p>
            
            {/* Last updated indicator */}
            {lastUpdated && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Updated {getTimeAgo()}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <motion.div
                  className="inline-block h-12 w-12 rounded-full border-4 border-t-transparent border-[#D4AF37]"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="mt-6 text-lg text-gray-400">
                  Loading events...
                </p>
              </motion.div>
            </div>
          )}

          {/* Events Grid */}
          {!loading && events.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-300 text-xl mb-3">No major updates yet — refresh in a few hours.</p>
              <p className="text-gray-500 text-sm">AI is gathering new verified events from trusted sources.</p>
              <div className="mt-6">
                <a
                  href="/api/generateDiverseEvents"
                  target="_blank"
                  className="inline-block px-6 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors"
                >
                  Generate Sample Events
                </a>
              </div>
            </div>
          )}

          {!loading && events.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            >
              {events.map((event) => (
                <motion.div key={event.id} variants={fadeInUp}>
                  <EventCard event={event} variant="compact" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* View All Button */}
          {events.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <Link
                href="/timeline"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#D4AF37] text-white font-bold text-lg rounded-xl hover:bg-[#E5C878] shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span>View Full Timeline</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Why Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Why RealTea Exists
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
            The truth changes fast. One day everyone's sure of something, the next it's proven wrong. 
            <span className="text-[#D4AF37] font-semibold"> RealTea keeps up</span> — a timeline that evolves with the facts.
          </p>
        </motion.div>
      </section>

        {/* Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
