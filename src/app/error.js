'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border-2 border-red-500/30">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
            className="text-8xl mb-4"
          >
            ⚠️
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Oops! Something went wrong
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error.message || 'An unexpected error occurred'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <motion.button
              onClick={reset}
              className="px-6 py-3 bg-gold-gradient text-bg-dark font-bold rounded-xl shadow-lg hover:shadow-gold-primary/50 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🔄 Try Again
            </motion.button>
            
            <motion.a
              href="/"
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold rounded-xl border-2 border-gold-primary/30 hover:border-gold-primary/60 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🏠 Go Home
            </motion.a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              If this persists, please refresh the page or contact support.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

