"use client";

import { motion } from "framer-motion";

export default function EmptyState({ 
  icon = "📭",
  title = "No Data Yet",
  message = "Nothing to display at the moment.",
  actionLabel,
  actionHref,
  actionOnClick
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 px-4"
    >
      <div className="text-6xl mb-4">{icon}</div>
      
      <h3 className="text-2xl font-bold text-gray-300 mb-3">
        {title}
      </h3>
      
      <p className="text-gray-500 text-lg mb-6 max-w-md mx-auto">
        {message}
      </p>
      
      {(actionLabel && (actionHref || actionOnClick)) && (
        <div>
          {actionHref ? (
            <a href={actionHref}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors shadow-lg"
              >
                {actionLabel}
              </motion.button>
            </a>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={actionOnClick}
              className="px-8 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors shadow-lg"
            >
              {actionLabel}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

