"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { generateAndSaveEvent } from "../lib/aiEventGenerator";

// Animation variants
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

export default function Timeline() {
  // State management
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Real-time event listener using onSnapshot
  useEffect(() => {
    console.log('🔄 [TIMELINE] Setting up real-time listener...');
    
    if (!db) {
      console.error("❌ [TIMELINE] Firestore database not initialized");
      setError("Firestore database not initialized");
      setLoading(false);
      return;
    }
    
    // Get events collection reference with real-time listener
    const eventsRef = collection(db, "events");
    const eventsQuery = query(eventsRef, orderBy("createdAt", "desc"));
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      eventsQuery,
      (querySnapshot) => {
        console.log(`📊 [TIMELINE] Real-time update: ${querySnapshot.size} events received`);
        
        // Map documents to event objects with comprehensive fallbacks
        const fetchedEvents = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data?.headline || data?.title || "Untitled Event",
            description: data?.description || data?.summary || "No description available.",
            date: data?.date || data?.seendate || new Date().toISOString().split('T')[0],
            year: data?.date ? data.date.split('-')[0] : (data?.seendate ? data.seendate.substring(0, 4) : new Date().getFullYear().toString()),
            category: data?.category || "World",
            imageUrl: data?.imageUrl || data?.socialimage || "",
            location: data?.location || data?.sourcecountry || "",
            verifiedSource: data?.verifiedSource || data?.url || "",
            addedBy: data?.addedBy || data?.author || data?.domain || "Unknown",
            aiGenerated: data?.aiGenerated || false,
            newsGenerated: data?.newsGenerated || false,
            isBreaking: data?.isBreaking || false,
            createdAt: data?.createdAt || null
          };
        });
        
        // Events are already sorted by createdAt desc from query
        console.log(`✅ [TIMELINE] Successfully loaded ${fetchedEvents.length} events (sorted by createdAt desc)`);
        console.log(`📅 [TIMELINE] Date range: ${fetchedEvents[0]?.year || 'N/A'} to ${fetchedEvents[fetchedEvents.length - 1]?.year || 'N/A'}`);
        console.log(`📍 [TIMELINE] Events with location: ${fetchedEvents.filter(e => e.location && e.location !== 'Unknown').length}`);
        
        setEvents(fetchedEvents);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ [TIMELINE] Error in real-time listener:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    // Cleanup listener on unmount
    return () => {
      console.log('🗑️ [TIMELINE] Cleaning up real-time listener');
      unsubscribe();
    };
  }, []);

  // Handle AI event generation
  const handleGenerateEvent = async () => {
    setGenerating(true);
    setGenerationError(null);

    try {
      console.log("🤖 Starting AI event generation...");
      
      // Generate and save the event
      const newEvent = await generateAndSaveEvent();
      
      console.log("✅ AI event generated and saved:", newEvent);
      
      // No need to manually refresh - onSnapshot will auto-update!
      
    } catch (err) {
      console.error("❌ Error generating AI event:", err);
      setGenerationError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
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
          <p className="mt-6 text-lg text-[#e5e5e5] font-medium">
            Loading timeline...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-8xl mb-6">⚠️</div>
          <h2 className="text-3xl font-bold text-[#e5e5e5] mb-4">
            Unable to load events
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-all duration-300"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-8xl mb-6">📭</div>
          <h2 className="text-3xl font-bold text-[#e5e5e5] mb-4">
            No events available yet
          </h2>
          <p className="text-lg text-gray-400">
            Be the first to add an event to the timeline!
          </p>
        </motion.div>
      </div>
    );
  }

  // Main timeline display
  return (
    <div className="min-h-screen bg-[#0b0b0b] py-20 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
            Timeline
          </h1>
          <p className="text-xl text-gray-400 mb-6">
            {events.length} {events.length === 1 ? 'event' : 'events'} in history
          </p>

          {/* AI Generate Button */}
          <motion.button
            onClick={handleGenerateEvent}
            disabled={generating}
            whileHover={!generating ? { scale: 1.05 } : {}}
            whileTap={!generating ? { scale: 0.95 } : {}}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 mx-auto ${
              generating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-[#D4AF37] text-[#0b0b0b] hover:bg-[#E5C878] shadow-lg hover:shadow-[#D4AF37]/50'
            }`}
          >
            {generating ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span className="text-2xl">✨</span>
                <span>Generate AI Event</span>
              </>
            )}
          </motion.button>

          {/* Generation Error */}
          {generationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm max-w-md mx-auto"
            >
              <span className="font-semibold">Error:</span> {generationError}
            </motion.div>
          )}
        </motion.div>

        {/* Timeline Events */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="group relative"
            >
              {/* Timeline connector line (except for last item) */}
              {index < events.length - 1 && (
                <div className="absolute left-8 top-24 bottom-0 w-0.5 bg-gradient-to-b from-[#D4AF37] to-transparent opacity-30" />
              )}

              {/* Event Card */}
              <div className="flex gap-6">
                {/* Year Indicator Circle */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border-2 border-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                    <span className="text-[#D4AF37] font-bold text-sm">
                      {event.year}
                    </span>
                  </div>
                </div>

                {/* Event Content Card */}
                <div className="flex-1 bg-[#1a1a1a] rounded-xl p-8 shadow-lg hover:shadow-2xl hover:shadow-[#D4AF37]/10 transition-all duration-500 group-hover:translate-x-2">
                  
                  {/* Category and Breaking Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg text-[#D4AF37] text-xs font-semibold uppercase tracking-wide">
                      {event.category}
                    </span>
                    {event.isBreaking && (
                      <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs font-bold uppercase tracking-wide flex items-center gap-1 animate-pulse">
                        <span>🔥</span>
                        <span>Breaking</span>
                      </span>
                    )}
                    {event.newsGenerated && (
                      <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400 text-xs font-semibold">
                        📰 News
                      </span>
                    )}
                  </div>

                  {/* Title with AI Badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <h3 className="flex-1 text-3xl font-bold text-[#e5e5e5] group-hover:text-[#D4AF37] transition-colors duration-300">
                      {event.title}
                    </h3>
                    {event.aiGenerated && (
                      <span className="flex-shrink-0 px-2 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded text-[#D4AF37] text-xs font-semibold flex items-center gap-1">
                        <span>✨</span>
                        <span>AI</span>
                      </span>
                    )}
                  </div>

                  {/* Year/Date */}
                  <p className="text-[#D4AF37] font-semibold text-sm mb-4">
                    {event.date || event.year}
                  </p>

                  {/* Description */}
                  <p className="text-gray-400 leading-relaxed mb-4">
                    {event.description}
                  </p>

                  {/* Image (if available) */}
                  {event.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {/* Location */}
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}
                    
                    {/* Verified Source */}
                    {event.verifiedSource && (
                      <a
                        href={event.verifiedSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#D4AF37] hover:text-[#E5C878] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Verified Source</span>
                      </a>
                    )}
                    
                    {/* Added By */}
                    {event.addedBy && event.addedBy !== "Unknown" && (
                      <div className="flex items-center gap-1">
                        <span className="italic">Added by {event.addedBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
