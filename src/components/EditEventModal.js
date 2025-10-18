"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateEvent } from "../lib/firestoreService";

export default function EditEventModal({ event, isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Politics");
  const [verifiedSource, setVerifiedSource] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  // Pre-fill form when modal opens
  useEffect(() => {
    if (isOpen && event) {
      setTitle(event.title || "");
      setDate(event.date || "");
      setLocation(event.location || "");
      setCategory(event.category || "Politics");
      setVerifiedSource(event.verifiedSource || "");
      setDescription(event.description || "");
      setImageUrl(event.imageUrl || "");
      setError("");
    }
  }, [isOpen, event]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        date: date,
        location: location.trim(),
        category: category,
        verifiedSource: verifiedSource.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
      });
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error updating event:", err);
      setError(err?.message || "Failed to update event. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-accent-gradient">Edit Event</h2>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <div className="p-6">
                {error && (
                  <motion.div
                    className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={submitting}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                      placeholder="e.g., First Moon Landing"
                    />
                  </div>

                  {/* Date and Location */}
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        disabled={submitting}
                        className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-gold-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={submitting}
                        className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                        placeholder="e.g., New York, USA"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-gold-primary focus:ring-gold-primary/20"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Verified Source */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Verified Source (URL)
                    </label>
                    <input
                      type="url"
                      value={verifiedSource}
                      onChange={(e) => setVerifiedSource(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                      placeholder="https://source.com/article"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={submitting}
                      rows={5}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 resize-none bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                      placeholder="Provide details about this event..."
                    />
                  </div>

                  {/* Image URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <motion.button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={!submitting ? { scale: 1.02 } : {}}
                      whileTap={!submitting ? { scale: 0.98 } : {}}
                    >
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={onClose}
                      disabled={submitting}
                      className="flex-1 btn-secondary disabled:opacity-50"
                      whileHover={!submitting ? { scale: 1.02 } : {}}
                      whileTap={!submitting ? { scale: 0.98 } : {}}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

