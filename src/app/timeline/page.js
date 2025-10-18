"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import EventCard from "../../components/EventCard";
import Footer from "../../components/Footer";
import { db } from "../../lib/firebase";
import { collection, query, orderBy, limit, startAfter, getDocs, where, onSnapshot } from "firebase/firestore";

export default function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalLoaded, setTotalLoaded] = useState(0);
  
  // Advanced filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCredibility, setSelectedCredibility] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  const PAGE_SIZE = 100;

  // Fetch initial events
  const fetchEvents = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setEvents([]);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      console.log('📊 [TIMELINE] Fetching events from Firestore...');

      if (!db) {
        throw new Error('Firestore not initialized');
      }

      const eventsRef = collection(db, 'events');
      
      // Build query - order by date (for chronological timeline)
      let q;
      if (reset || !lastDoc) {
        q = query(eventsRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      } else {
        q = query(eventsRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(q);
      
      const fetchedEvents = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'Other',
          location: data.location || '',
          year: data.year || new Date().getFullYear().toString(),
          date: data.date || '',
          imageUrl: data.imageUrl || '',
          verifiedSource: data.verifiedSource || data.url || '',
          urgency: data.urgency || 0,
          isBreaking: data.isBreaking || false,
          newsGenerated: data.newsGenerated || false,
          aiGenerated: data.aiGenerated || false,
          source: data.source || {},
          addedBy: data.addedBy || 'Unknown',
          createdAt: data.createdAt
        };
      });

      if (reset) {
        setEvents(fetchedEvents);
        setTotalLoaded(fetchedEvents.length);
        console.log(`✅ [TIMELINE] Timeline loaded ${fetchedEvents.length} events (initial batch)`);
        console.log(`📊 [TIMELINE] Sorted by year (descending)`);
      } else {
        setEvents(prev => [...prev, ...fetchedEvents]);
        const newTotal = events.length + fetchedEvents.length;
        setTotalLoaded(newTotal);
        console.log(`✅ [TIMELINE] Loaded ${fetchedEvents.length} more events`);
        console.log(`📊 [TIMELINE] Timeline loaded ${newTotal} events total`);
      }

      // Update pagination state
      if (snapshot.docs.length < PAGE_SIZE) {
        setHasMore(false);
        const totalCount = reset ? fetchedEvents.length : events.length + fetchedEvents.length;
        console.log(`🎉 [TIMELINE] All ${totalCount} events loaded successfully`);
      } else {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(true);
        console.log(`📜 [TIMELINE] More events available (loading ${PAGE_SIZE} per scroll)`);
      }

    } catch (error) {
      console.error('❌ [TIMELINE] Error fetching events:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc, events.length]);

  // Initial load with real-time listener
  useEffect(() => {
    fetchEvents(true);
    
    // Set up real-time listener for new events
    if (!db) {
      console.error('❌ [TIMELINE] Firestore not initialized');
      return;
    }

    const eventsRef = collection(db, 'events');
    const realtimeQuery = query(eventsRef, orderBy('createdAt', 'desc'), limit(10));
    
    // Listen for new events (top 10 most recent)
    const unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
      const changes = snapshot.docChanges();
      const newEvents = changes
        .filter(change => change.type === 'added')
        .map(change => {
          const data = change.doc.data();
          return {
            id: change.doc.id,
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'Other',
            location: data.location || '',
            year: data.year || new Date().getFullYear().toString(),
            date: data.date || '',
            imageUrl: data.imageUrl || '',
            verifiedSource: data.verifiedSource || data.url || '',
            urgency: data.urgency || 0,
            isBreaking: data.isBreaking || false,
            newsGenerated: data.newsGenerated || false,
            aiGenerated: data.aiGenerated || false,
            source: data.source || {},
            addedBy: data.addedBy || 'Unknown',
            createdAt: data.createdAt
          };
        });

      if (newEvents.length > 0) {
        console.log(`🔄 [TIMELINE] Real-time: ${newEvents.length} new events detected`);
        // Prepend new events to the list
        setEvents(prev => [...newEvents, ...prev]);
        setTotalLoaded(prev => prev + newEvents.length);
      }
    }, (error) => {
      console.error('❌ [TIMELINE] Real-time listener error:', error);
    });

    return () => unsubscribe();
  }, []);

  // Advanced filter and search
  useEffect(() => {
    let filtered = [...events];

    // Text search (title, description, location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query) ||
        (e.location && e.location.toLowerCase().includes(query)) ||
        (e.category && e.category.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory === 'Breaking') {
      filtered = filtered.filter(e => e.isBreaking);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    // Region filter
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(e => {
        const location = (e.location || '').toLowerCase();
        const region = (e.region || '').toLowerCase();
        return location.includes(selectedRegion.toLowerCase()) || region.includes(selectedRegion.toLowerCase());
      });
    }

    // Credibility filter
    if (selectedCredibility !== 'all') {
      const credibilityThreshold = parseFloat(selectedCredibility);
      filtered = filtered.filter(e => {
        const score = e.credibilityScore || 0;
        if (selectedCredibility === '0.8') return score >= 80;
        if (selectedCredibility === '0.6') return score >= 60;
        if (selectedCredibility === '0.4') return score >= 40;
        return true;
      });
    }

    // Date range filter
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(e => {
        if (!e.date) return false;
        const eventDate = new Date(e.date);
        if (dateRange.start && eventDate < new Date(dateRange.start)) return false;
        if (dateRange.end && eventDate > new Date(dateRange.end)) return false;
        return true;
      });
    }

    console.log(`🔍 [TIMELINE] Filtered: ${filtered.length} events (search="${searchQuery}", category=${selectedCategory}, region=${selectedRegion})`);
    setFilteredEvents(filtered);
  }, [events, searchQuery, selectedCategory, selectedRegion, selectedCredibility, dateRange]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      // Trigger when user is within 800px of bottom
      if (scrollTop + clientHeight >= scrollHeight - 800) {
        console.log('📜 [TIMELINE] User near bottom - loading more events...');
        fetchEvents(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, fetchEvents]);

  // Categories and regions for filters
  const categories = ['all', 'Breaking', 'Politics', 'Science', 'Technology', 'War', 'Environment', 'Economy', 'Culture', 'Medicine', 'Space', 'Human Rights', 'World', 'Other'];
  const regions = ['all', 'Global', 'North America', 'Europe', 'Asia', 'Africa', 'Middle East', 'South America', 'Oceania'];

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedRegion('all');
    setSelectedCredibility('all');
    setDateRange({ start: '', end: '' });
  };

  // Count active filters
  const activeFiltersCount = [
    searchQuery.trim(),
    selectedCategory !== 'all',
    selectedRegion !== 'all',
    selectedCredibility !== 'all',
    dateRange.start || dateRange.end
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent text-center">
            🔍 Global Event Search
          </h1>
          <p className="text-lg text-gray-400 text-center mb-8">
            Search and filter {totalLoaded.toLocaleString()} verified events from history
          </p>

          {/* Main Search Bar */}
          <div className="max-w-3xl mx-auto mb-6">
            <div className="relative">
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title, description, location, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-5 bg-gray-800 border-2 border-gray-700 rounded-2xl text-white text-lg placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20 transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Toggle Button */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-semibold">Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 bg-[#D4AF37] text-black text-xs font-bold rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-[#D4AF37] transition"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="max-w-5xl mx-auto mb-8 p-6 bg-gray-800 border border-gray-700 rounded-2xl shadow-md"
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Region</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition"
                  >
                    {regions.map(region => (
                      <option key={region} value={region}>
                        {region === 'all' ? 'All Regions' : region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credibility Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Minimum Credibility</label>
                  <select
                    value={selectedCredibility}
                    onChange={(e) => setSelectedCredibility(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition"
                  >
                    <option value="all">All Scores</option>
                    <option value="0.8">High (80+)</option>
                    <option value="0.6">Medium (60+)</option>
                    <option value="0.4">Low (40+)</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-3">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition"
                    />
                    <span className="text-gray-600 self-center">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37] transition"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Results Summary */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {loading ? (
                'Loading events...'
              ) : filteredEvents.length === events.length ? (
                `Showing all ${filteredEvents.length.toLocaleString()} events`
              ) : (
                <>
                  Found <span className="text-[#D4AF37] font-bold">{filteredEvents.length.toLocaleString()}</span> of {events.length.toLocaleString()} events
                  {searchQuery && <span className="text-gray-500"> for "{searchQuery}"</span>}
                </>
              )}
            </p>
          </div>
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
                className="inline-block h-16 w-16 rounded-full border-4 border-t-transparent border-[#D4AF37]"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
                <p className="mt-6 text-lg text-gray-400">
                  Loading timeline...
                </p>
            </motion.div>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredEvents.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-4"
          >
            <div className="text-7xl mb-6">🔍</div>
            <h2 className="text-3xl font-bold text-gray-300 mb-4">
              No events found
              {searchQuery && (
                <span className="block mt-2 text-[#D4AF37]">
                  for "{searchQuery}"
                </span>
              )}
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
              Try adjusting your search or filters to find what you're looking for
            </p>
            
            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Active filters:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {searchQuery && (
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm">
                      Search: "{searchQuery}"
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm">
                      Category: {selectedCategory}
                    </span>
                  )}
                  {selectedRegion !== 'all' && (
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm">
                      Region: {selectedRegion}
                    </span>
                  )}
                  {selectedCredibility !== 'all' && (
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm">
                      Credibility: {selectedCredibility === '0.8' ? '80+' : selectedCredibility === '0.6' ? '60+' : '40+'}
                    </span>
                  )}
                  {(dateRange.start || dateRange.end) && (
                    <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 shadow-sm">
                      Date: {dateRange.start || '...'} to {dateRange.end || '...'}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-black font-semibold rounded-xl hover:bg-[#E5C878] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear all filters
            </button>
          </motion.div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Load More Indicator */}
        {loadingMore && hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <motion.div
              className="inline-block h-10 w-10 rounded-full border-3 border-t-transparent border-[#D4AF37]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-4 text-gray-400 font-medium">Loading more events...</p>
            <p className="mt-2 text-gray-600 text-sm">Loaded {totalLoaded} so far</p>
          </motion.div>
        )}

        {/* End of results */}
        {!loading && !hasMore && events.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-gray-700 font-semibold text-lg mb-2">You've reached the end!</p>
            <p className="text-gray-500 text-sm">All {totalLoaded.toLocaleString()} events have been loaded</p>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
