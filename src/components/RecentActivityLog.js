"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivityLog({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#D4AF37] mb-4">Recent AI Activity</h3>
        <div className="text-gray-500 text-center py-8">No recent activity</div>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'news': return '📰';
      case 'ai': return '🤖';
      case 'history': return '📜';
      case 'breaking': return '🔥';
      default: return '📝';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'breaking': return '#e63946';
      case 'news': return '#00ffaa';
      case 'ai': return '#D4AF37';
      case 'history': return '#4cc9f0';
      default: return '#888';
    }
  };

  return (
    <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#D4AF37]">Recent AI Activity</h3>
        <span className="text-xs text-gray-500">Last 10 entries</span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-gray-800 hover:border-[#D4AF37]/30 transition-colors"
          >
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ 
                backgroundColor: `${getActivityColor(activity.type)}20`,
                border: `1px solid ${getActivityColor(activity.type)}`
              }}
            >
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-200 line-clamp-1">
                {activity.title}
              </h4>
              <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                {activity.category} • {activity.location || 'Unknown location'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span 
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${getActivityColor(activity.type)}20`,
                    color: getActivityColor(activity.type)
                  }}
                >
                  {activity.type}
                </span>
                <span className="text-xs text-gray-600">
                  {activity.createdAt ? formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true }) : 'Unknown time'}
                </span>
              </div>
            </div>
            
            {activity.isBreaking && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  🔥 LIVE
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

