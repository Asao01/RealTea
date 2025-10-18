"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

/**
 * Toast notification component
 * Shows temporary messages with auto-dismiss
 */
export default function Toast({ message, type = "info", duration = 3000, onClose }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-300 dark:border-green-500/30",
      text: "text-green-700 dark:text-green-400",
      icon: "✅",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300 dark:border-red-500/30",
      text: "text-red-700 dark:text-red-400",
      icon: "❌",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-300 dark:border-yellow-500/30",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: "⚠️",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-300 dark:border-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: "ℹ️",
    },
    loading: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-300 dark:border-blue-500/30",
      text: "text-blue-700 dark:text-blue-400",
      icon: "⏳",
    },
  };

  const style = styles[type] || styles.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed top-4 right-4 z-[9999] max-w-md w-full md:w-auto min-w-[300px] p-4 rounded-xl shadow-2xl border ${style.bg} ${style.border}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{style.icon}</span>
        <div className="flex-1">
          <p className={`${style.text} font-semibold text-sm`}>
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${style.text} hover:opacity-70 transition-opacity`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Progress bar for timed toasts */}
      {duration > 0 && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className={`h-1 ${style.bg.replace('/20', '/40')} mt-3 rounded-full`}
        />
      )}
    </motion.div>
  );
}

/**
 * Toast container for managing multiple toasts
 */
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-0 right-0 z-[9999] p-4 pointer-events-none">
      <div className="space-y-3 pointer-events-auto">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => onRemove(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

