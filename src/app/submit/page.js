"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "../../components/ProtectedRoute";
import { addEvent } from "../../lib/firestoreService";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePerformance } from "../../context/PerformanceContext";

export default function SubmitPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { shouldUseAI, shouldAnimate, performanceMode } = usePerformance();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Politics");
  const [verifiedSource, setVerifiedSource] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [factChecking, setFactChecking] = useState(false);

  const categories = [
    "Politics",
    "Science",
    "Culture",
    "Conflict",
    "Technology",
    "Economy",
    "Environment",
    "Sports",
    "Other"
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date.trim()) {
      setError("Date is required");
      return;
    }

    setSubmitting(true);
    
    // Only show fact-checking UI if AI is enabled
    if (shouldUseAI) {
      setFactChecking(true);
    }
    
    try {
      const payload = {
        title: title.trim(),
        date: date,
        location: location.trim(),
        category: category,
        verifiedSource: verifiedSource.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
      };

      // Skip AI if performance mode is enabled
      await addEvent(payload, user, !shouldUseAI);
      setFactChecking(false);
      setSuccess(true);
      
      // Clear form
      setTitle("");
      setDate("");
      setLocation("");
      setCategory("Politics");
      setVerifiedSource("");
      setDescription("");
      setImageUrl("");

      // Redirect to homepage after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Error adding event:", err);
      setError(err?.message || "Failed to add event. Please try again.");
      setFactChecking(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-accent-gradient">Submit an Event</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Add a new event to the RealTea timeline
            </p>
          </div>

          <motion.div
            className="rounded-2xl border p-8 shadow-2xl bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Success Message */}
            {success && (
              <motion.div
                className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-500/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-700 dark:text-green-400 font-semibold">Event added successfully!</p>
                    <p className="text-green-600 dark:text-green-500 text-sm">Redirecting to homepage...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Performance Mode Notice */}
            {performanceMode && (
              <motion.div
                className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-500/30"
                initial={shouldAnimate ? { opacity: 0, y: -10 } : {}}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3 }}
              >
                <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                  🚀 Performance mode is ON - AI fact-checking is disabled for faster submission.
                </p>
              </motion.div>
            )}

            {/* Fact-Checking Progress */}
            {factChecking && shouldUseAI && (
              <motion.div
                className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-500/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="flex-shrink-0 w-8 h-8 rounded-full border-4 border-t-transparent border-blue-500"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <div>
                    <p className="text-blue-700 dark:text-blue-400 font-semibold">AI Fact-Checking in Progress...</p>
                    <p className="text-blue-600 dark:text-blue-500 text-sm">Verifying event credibility with AI</p>
                  </div>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={submitting || success}
                  className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                  placeholder="e.g., First Moon Landing"
                />
              </div>

              {/* Date and Location Row */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* Date Input */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    disabled={submitting || success}
                    className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-gold-primary/20"
                  />
                </div>

                {/* Location Input */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={submitting || success}
                    className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                    placeholder="e.g., Cape Canaveral, Florida"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={submitting || success}
                  className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-gold-primary/20"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Verified Source Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Verified Source (URL)
                </label>
                <input
                  type="url"
                  value={verifiedSource}
                  onChange={(e) => setVerifiedSource(e.target.value)}
                  disabled={submitting || success}
                  className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                  placeholder="https://source.com/article"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting || success}
                  rows={5}
                  className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed resize-none bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                  placeholder="Provide details about this event..."
                />
              </div>

              {/* Image URL Input */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  disabled={submitting || success}
                  className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={submitting || success}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!submitting && !success ? { scale: 1.02 } : {}}
                whileTap={!submitting && !success ? { scale: 0.98 } : {}}
              >
                {factChecking ? '🔍 AI Fact-Checking...' : submitting ? 'Saving Event...' : success ? '✅ Event Added!' : '➕ Add Event'}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}


