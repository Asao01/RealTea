"use client";

import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

export default function ContactPage() {
  const { isDark } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="min-h-screen pt-32 pb-16 px-6"
    >
      <div className="max-w-2xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
          className={`text-5xl font-bold mb-8 ${
            isDark
              ? 'bg-gradient-to-r from-[#FFD700] via-white to-[#FFD700] bg-clip-text text-transparent'
              : 'text-[#0F0F0F]'
          }`}
        >
          Contact Us
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut", delay: 0.4 }}
          className="space-y-6"
        >
          <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-[#0F0F0F]'}`}>
            Have questions, suggestions, or feedback? We'd love to hear from you!
          </p>

          <div className={`p-6 rounded-xl border ${
            isDark
              ? 'bg-[#1a1a1a]/50 border-[#FFD700]/20'
              : 'bg-[#ADADAD]/50 border-[#B49700]/20'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDark ? 'text-[#FFD700]' : 'text-[#B49700]'
            }`}>
              Get In Touch
            </h3>
            <p className={isDark ? 'text-gray-300' : 'text-[#0F0F0F]'}>
              Email: info@realtea-timeline.com
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

