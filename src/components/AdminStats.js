"use client";

import { motion } from "framer-motion";

export default function AdminStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#141414] border border-gray-700 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-700 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Events",
      value: stats.totalEvents?.toLocaleString() || 0,
      icon: "📊",
      color: "#D4AF37",
      change: "+12% this month"
    },
    {
      title: "Today's Events",
      value: stats.todayEvents || 0,
      icon: "🆕",
      color: "#00ffaa",
      change: "New additions"
    },
    {
      title: "Breaking News",
      value: stats.breakingEvents || 0,
      icon: "🔥",
      color: "#e63946",
      change: "Active now"
    },
    {
      title: "Total Users",
      value: stats.totalUsers || 0,
      icon: "👥",
      color: "#4cc9f0",
      change: "Registered"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-[#141414] border border-gray-700 rounded-xl p-6 hover:border-[#D4AF37] transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-3xl">{stat.icon}</div>
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stat.color, boxShadow: `0 0 10px ${stat.color}` }}
            />
          </div>
          
          <h3 className="text-sm text-gray-400 mb-2">{stat.title}</h3>
          
          <div className="flex items-end justify-between">
            <span 
              className="text-3xl font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </span>
            <span className="text-xs text-gray-500">{stat.change}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

