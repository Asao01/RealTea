"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addEvent } from "../lib/firestoreService";
import { reverseGeocode } from "../lib/geocoding";

export default function AddEventPinModal({ isOpen, onClose, coordinates, user, onSuccess }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Politics");
  const [verifiedSource, setVerifiedSource] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState("");
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

  // Reverse geocode coordinates to location name
  useEffect(() => {
    if (isOpen && coordinates) {
      setLoadingLocation(true);
      reverseGeocode(coordinates.lat, coordinates.lng)
        .then(name => {
          setLocationName(name || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
        })
        .catch(() => {
          setLocationName(`${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`);
        })
        .finally(() => {
          setLoadingLocation(false);
        });
    }
  }, [isOpen, coordinates]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDate("");
      setCategory("Politics");
      setVerifiedSource("");
      setDescription("");
      setError("");
    }
  }, [isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setSubmitting(true);
    setFactChecking(true);
    try {
      const payload = {
        title: title.trim(),
        date: date,
        location: locationName,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        category: category,
        verifiedSource: verifiedSource.trim(),
        description: description.trim(),
        imageUrl: "",
      };

      await addEvent(payload, user);
      setFactChecking(false);
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error adding event:", err);
      setError(err?.message || "Failed to add event. Please try again.");
      setFactChecking(false);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4 pointer-events-none">
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
                <div>
                  <h2 className="text-2xl font-bold text-accent-gradient">📍 Add Event at This Location</h2>
                  {loadingLocation ? (
                    <p className="text-sm text-gray-500 mt-1">🌍 Finding location...</p>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{locationName}</p>
                  )}
                </div>
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

                {/* Fact-Checking Progress */}
                {factChecking && (
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
                  {/* Coordinates (Read-only) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-500">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={coordinates?.lat.toFixed(6) || ""}
                        readOnly
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-500">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={coordinates?.lng.toFixed(6) || ""}
                        readOnly
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                      />
                    </div>
                  </div>

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
                      placeholder="e.g., Historic Event Name"
                    />
                  </div>

                  {/* Date */}
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
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      disabled={submitting}
                      rows={4}
                      className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 disabled:opacity-50 resize-none bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                      placeholder="Describe what happened at this location..."
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
                      {factChecking ? '🔍 AI Fact-Checking...' : submitting ? 'Saving...' : '📍 Add Event to Map'}
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

