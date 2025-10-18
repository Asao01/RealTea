"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, orderBy, limit, where, doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { isAdmin } from "../../lib/adminAuth";
import AdminStats from "../../components/AdminStats";
import CategoryChart from "../../components/CategoryChart";
import RecentActivityLog from "../../components/RecentActivityLog";
import Footer from "../../components/Footer";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({});
  const [categoryData, setCategoryData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [unverifiedEvents, setUnverifiedEvents] = useState([]);
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [verifying, setVerifying] = useState({});

  // Check authentication and admin status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        console.log('❌ [ADMIN] Not logged in, redirecting to login');
        router.push('/login?redirect=/admin');
        return;
      }

      const adminStatus = isAdmin(currentUser);
      console.log(`🔐 [ADMIN] User: ${currentUser.email}, Admin: ${adminStatus}`);
      
      if (!adminStatus) {
        console.log('❌ [ADMIN] Unauthorized access attempt');
        alert('Unauthorized: Admin access required');
        router.push('/');
        return;
      }

      setUser(currentUser);
      setAuthorized(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch admin data
  useEffect(() => {
    if (!authorized || !db) return;

    fetchAdminData();
  }, [authorized]);

  async function fetchAdminData() {
    try {
      console.log('📊 [ADMIN] Fetching dashboard data...');
      setLoadingStats(true);

      const eventsRef = collection(db, 'events');
      
      // Get all events
      const allEventsQuery = query(eventsRef);
      const allEventsSnap = await getDocs(allEventsQuery);
      const totalEvents = allEventsSnap.size;

      // Get today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);
      
      const todayQuery = query(
        eventsRef,
        where('createdAt', '>=', todayTimestamp)
      );
      const todaySnap = await getDocs(todayQuery);
      const todayEvents = todaySnap.size;

      // Get breaking events
      const breakingQuery = query(
        eventsRef,
        where('isBreaking', '==', true)
      );
      const breakingSnap = await getDocs(breakingQuery);
      const breakingEvents = breakingSnap.size;

      // Category distribution
      const categoryMap = {};
      allEventsSnap.docs.forEach(doc => {
        const category = doc.data().category || 'Unknown';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      const categoryData = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Recent AI activity
      const recentQuery = query(
        eventsRef,
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const recentSnap = await getDocs(recentQuery);
      const recentEvents = recentSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: doc.data().newsGenerated ? 'news' : doc.data().aiGenerated ? 'ai' : 'history'
      }));

      // Unverified events
      const unverifiedQuery = query(
        eventsRef,
        where('verified', '==', false),
        limit(20)
      );
      const unverifiedSnap = await getDocs(unverifiedQuery);
      const unverifiedList = unverifiedSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setStats({
        totalEvents,
        todayEvents,
        breakingEvents,
        totalUsers: 0 // Placeholder - add user tracking if needed
      });

      setCategoryData(categoryData);
      setRecentActivity(recentEvents);
      setUnverifiedEvents(unverifiedList);

      console.log(`✅ [ADMIN] Loaded: ${totalEvents} total events, ${todayEvents} today, ${breakingEvents} breaking`);
      setLoadingStats(false);

    } catch (error) {
      console.error('❌ [ADMIN] Error fetching data:', error);
      setLoadingStats(false);
    }
  }

  async function verifyEvent(eventId, verified) {
    setVerifying(prev => ({ ...prev, [eventId]: true }));
    
    try {
      const eventRef = doc(db, 'events', eventId);
      await setDoc(eventRef, {
        verified: verified,
        verifiedAt: serverTimestamp(),
        verifiedBy: user.email
      }, { merge: true });

      console.log(`✅ [ADMIN] Event ${eventId} marked as ${verified ? 'verified' : 'unverified'}`);
      
      // Update local state
      setUnverifiedEvents(prev => 
        prev.filter(e => e.id !== eventId)
      );

      // Refresh data
      fetchAdminData();

    } catch (error) {
      console.error('❌ [ADMIN] Error verifying event:', error);
      alert('Failed to verify event');
    } finally {
      setVerifying(prev => ({ ...prev, [eventId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="inline-block h-16 w-16 rounded-full border-4 border-t-transparent border-[#D4AF37]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="mt-6 text-lg text-gray-400">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <div className="max-w-7xl mx-auto px-4 py-20 mt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-xl text-gray-400">
            Welcome back, {user?.email} 👋
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="mb-12">
          <AdminStats stats={stats} loading={loadingStats} />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <CategoryChart data={categoryData} />
          <RecentActivityLog activities={recentActivity} />
        </div>

        {/* Unverified Events Section */}
        {unverifiedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#D4AF37]">
                Unverified Events ({unverifiedEvents.length})
              </h2>
              <button
                onClick={fetchAdminData}
                className="px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-[#D4AF37] transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {unverifiedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 hover:border-[#D4AF37]/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {event.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded text-xs">
                          {event.category}
                        </span>
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs">
                          {event.year}
                        </span>
                        {event.location && (
                          <span className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs">
                            📍 {event.location}
                          </span>
                        )}
                        {event.isBreaking && (
                          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">
                            🔥 Breaking
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => verifyEvent(event.id, true)}
                        disabled={verifying[event.id]}
                        className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {verifying[event.id] ? '⏳' : '✅ Verify'}
                      </button>
                      <button
                        onClick={() => verifyEvent(event.id, false)}
                        disabled={verifying[event.id]}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {verifying[event.id] ? '⏳' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <button
            onClick={() => window.open('/api/updateDailyNews', '_blank')}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 hover:border-[#00ffaa] transition-all group"
          >
            <div className="text-3xl mb-3">📰</div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Update News</h3>
            <p className="text-sm text-gray-500">Fetch latest news articles</p>
          </button>

          <button
            onClick={() => window.open('/api/fetchHistory', '_blank')}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 hover:border-[#D4AF37] transition-all group"
          >
            <div className="text-3xl mb-3">📜</div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Generate History</h3>
            <p className="text-sm text-gray-500">Add historical events</p>
          </button>

          <button
            onClick={fetchAdminData}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6 hover:border-[#4cc9f0] transition-all group"
          >
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Refresh Data</h3>
            <p className="text-sm text-gray-500">Reload all statistics</p>
          </button>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
