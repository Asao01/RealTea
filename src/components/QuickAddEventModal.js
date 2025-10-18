"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addEvent } from "../lib/firestoreService";
import { useAuth } from "../context/AuthContext";
import { usePerformance } from "../context/PerformanceContext";

const CATEGORIES = [
  "Politics", "Science", "Technology", "Culture", "Sports", 
  "Economy", "Environment", "Health", "Education", "Other"
];

export default function QuickAddEventModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const { shouldAnimate, shouldUseAI } = usePerformance();
  
  const [formData, setFormData] = useState({
    title: "",
    year: new Date().getFullYear(),
    description: "",
    category: "Other",
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [factChecking, setFactChecking] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please sign in to add events");
      return;
    }

    setSubmitting(true);
    setError("");
    
    if (shouldUseAI) {
      setFactChecking(true);
    }

    try {
      const eventData = {
        title: formData.title,
        date: `${formData.year}-01-01`, // Default to January 1st
        description: formData.description,
        category: formData.category,
        location: "Not specified",
        verifiedSource: "User submitted",
      };

      await addEvent(eventData, user, !shouldUseAI);
      
      // Reset form
      setFormData({
        title: "",
        year: new Date().getFullYear(),
        description: "",
        category: "Other",
      });
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (err) {
      setError(err.message || "Failed to add event");
    } finally {
      setSubmitting(false);
      setFactChecking(false);
    }
  };

  if (!isOpen) return null;

  const ModalContent = (
    <motion.div
      initial={shouldAnimate ? { opacity: 0 } : {}}
      animate={shouldAnimate ? { opacity: 1 } : {}}
      exit={shouldAnimate ? { opacity: 0 } : {}}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={shouldAnimate ? { scale: 0.9, y: 20 } : {}}
        animate={shouldAnimate ? { scale: 1, y: 0 } : {}}
        exit={shouldAnimate ? { scale: 0.9, y: 20 } : {}}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gold-primary/30"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>✨</span>
            <span>Quick Add Event</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., First Moon Landing"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/20 outline-none transition-all"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Year *
            </label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              min="1000"
              max="2100"
              placeholder="2024"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/20 outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/20 outline-none transition-all"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Describe what happened..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/20 outline-none transition-all resize-none"
            />
          </div>

          {/* AI Fact-Checking Notice */}
          {shouldUseAI && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span>🤖</span>
                <span>This event will be automatically fact-checked by AI</span>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {/* Fact-Checking Progress */}
          {factChecking && (
            <div className="p-4 bg-gold-primary/10 border border-gold-primary/30 rounded-xl">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-gold-primary border-t-transparent rounded-full"
                />
                <span className="text-sm font-medium text-gold-primary">
                  AI is fact-checking your event...
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-xl font-semibold border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gold-gradient text-bg-dark hover:shadow-lg hover:shadow-gold-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⚙️
                  </motion.span>
                  Adding...
                </span>
              ) : (
                "Add Event"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return shouldAnimate ? (
    <AnimatePresence>
      {ModalContent}
    </AnimatePresence>
  ) : ModalContent;
}

