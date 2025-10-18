"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import StickyHeader from "../../components/StickyHeader";
import Footer from "../../components/Footer";
import SourceReliabilityChart from "../../components/SourceReliabilityChart";
import {
  anonymizeUserId,
  calculateSourceReliability,
  getTopContributors,
  formatSystemAction,
  calculateGlobalStats,
  getDisputedEvents,
  formatRelativeTime
} from "../../lib/transparencyHelpers";
import { calculateTrustScore } from "../../lib/antiAbuse";

export default function TransparencyPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentActions, setRecentActions] = useState([]);
  const [sourceReliability, setSourceReliability] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [disputedEvents, setDisputedEvents] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchTransparencyData();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchTransparencyData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchTransparencyData() {
    try {
      console.log('📊 [TRANSPARENCY] Fetching public transparency data...');
      
      if (!db) {
        console.error('❌ Firestore not initialized');
        setLoading(false);
        return;
      }

      // Fetch all events
      const eventsRef = collection(db, 'events');
      const eventsSnap = await getDocs(eventsRef);
      const events = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch user stats
      const userStatsRef = collection(db, 'userStats');
      const userStatsSnap = await getDocs(userStatsRef);
      const userStatsData = userStatsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          trustScore: calculateTrustScore(data)
        };
      });

      // Fetch recent system logs
      const logsRef = collection(db, 'systemLogs');
      const logsQuery = query(logsRef, orderBy('timestamp', 'desc'), limit(20));
      const logsSnap = await getDocs(logsQuery);
      const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate statistics
      const globalStats = calculateGlobalStats(events, userStatsData);
      const sources = calculateSourceReliability(events);
      const contributors = getTopContributors(userStatsData);
      const disputed = getDisputedEvents(events);
      const actions = logs.map(formatSystemAction);

      setStats(globalStats);
      setSourceReliability(sources);
      setTopContributors(contributors);
      setDisputedEvents(disputed);
      setRecentActions(actions);
      setLastUpdated(new Date());

      console.log('✅ [TRANSPARENCY] Data loaded:', {
        events: events.length,
        users: userStatsData.length,
        logs: logs.length
      });

      setLoading(false);

    } catch (error) {
      console.error('❌ Error fetching transparency data:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b]">
        <StickyHeader />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <motion.div
              className="inline-block h-16 w-16 rounded-full border-4 border-t-transparent border-[#D4AF37]"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="mt-6 text-lg text-gray-400">Loading transparency data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <StickyHeader />
      
      <div className="max-w-7xl mx-auto px-4 py-20 mt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
            Transparency & Source Audit
          </h1>
          <p className="text-xl text-gray-400 mb-4">
            Complete visibility into RealTea's data, sources, and operations
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Global Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-[#D4AF37] mb-1">
              {stats.totalEvents?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-400">Total Events</div>
          </div>

          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-[#00ffaa] mb-1">
              {stats.verifiedEvents?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-400">Verified Events</div>
          </div>

          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-2xl font-bold text-[#e63946] mb-1">
              {stats.contestedEvents?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-400">Contested/Flagged</div>
          </div>

          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6 text-center">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-[#4cc9f0] mb-1">
              {stats.activeUsers?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-400">Active Users (30d)</div>
          </div>
        </motion.div>

        {/* AI vs Human Ratio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141414] border border-gray-700 rounded-xl p-6 mb-12"
        >
          <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Content Sources</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <span className="text-gray-300">AI Generated</span>
                </div>
                <span className="text-[#D4AF37] font-bold">
                  {stats.aiGenerated || 0} ({Math.round((stats.aiGenerated / stats.totalEvents) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-[#D4AF37] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.aiGenerated / stats.totalEvents) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✍️</span>
                  <span className="text-gray-300">User Submitted</span>
                </div>
                <span className="text-[#4cc9f0] font-bold">
                  {stats.userSubmitted || 0} ({Math.round((stats.userSubmitted / stats.totalEvents) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div 
                  className="bg-[#4cc9f0] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(stats.userSubmitted / stats.totalEvents) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Source Reliability Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <SourceReliabilityChart data={sourceReliability} />
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Recent Changes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Recent Changes</h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {recentActions.map((action, index) => (
                <motion.div
                  key={action.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-gray-800"
                >
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                    style={{ 
                      backgroundColor: `${action.color}20`,
                      border: `1px solid ${action.color}`
                    }}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 mb-1">{action.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatRelativeTime(action.timestamp)} • {action.result}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Top Contributors */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Contributor Impact Board</h3>
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <motion.div
                  key={contributor.userId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                      index === 1 ? 'bg-gray-400/20 text-gray-400' :
                      index === 2 ? 'bg-orange-600/20 text-orange-600' :
                      'bg-gray-700/50 text-gray-500'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">{contributor.userId}</p>
                      <p className="text-xs text-gray-500">
                        {contributor.totalVotes} votes • {contributor.approvedCorrections} corrections
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#00ffaa]">
                      {contributor.trustScore}/100
                    </p>
                    <p className="text-xs text-gray-500">Trust Score</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Disputed Events Table */}
        {disputedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#141414] border border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-[#D4AF37] mb-4">
              Disputed or Under Review ({disputedEvents.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Event</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Date</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Credibility</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Votes</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Reason</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {disputedEvents.map((event, index) => (
                    <tr 
                      key={event.id}
                      className="border-b border-gray-800 hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td className="p-3 text-sm text-gray-300">{event.title.substring(0, 50)}...</td>
                      <td className="p-3 text-sm text-gray-400">{event.date}</td>
                      <td className="p-3">
                        <span className={`text-sm font-bold ${
                          event.credibilityScore >= 40 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {event.credibilityScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <span className="text-green-400">↑{event.upvotes}</span>
                        {' / '}
                        <span className="text-red-400">↓{event.downvotes}</span>
                      </td>
                      <td className="p-3 text-xs text-gray-500">{event.reason}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          event.status === 'Resolved' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6"
        >
          <h4 className="text-lg font-bold text-blue-300 mb-3">About This Page</h4>
          <div className="space-y-2 text-sm text-blue-200">
            <p>
              • All user information is anonymized to protect privacy (User#XXXX format)
            </p>
            <p>
              • Data refreshes automatically every 10 minutes
            </p>
            <p>
              • Source reliability is calculated from average event credibility scores
            </p>
            <p>
              • Trust scores are based on voting accuracy, account age, and contribution quality
            </p>
            <p>
              • System logs record all significant actions for complete transparency
            </p>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}

