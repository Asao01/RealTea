"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CommunityCorrectionModal({ event, onClose }) {
  const [correctionType, setCorrectionType] = useState('edit');
  const [field, setField] = useState('description');
  const [originalValue, setOriginalValue] = useState(event[field] || '');
  const [proposedValue, setProposedValue] = useState('');
  const [explanation, setExplanation] = useState('');
  const [sources, setSources] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      alert('Please login to suggest corrections');
      return;
    }

    if (!proposedValue.trim() || !explanation.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const correction = {
        eventId: event.id,
        eventTitle: event.title,
        correctionType,
        field,
        originalValue: event[field],
        proposedValue: proposedValue.trim(),
        explanation: explanation.trim(),
        sources: sources.trim(),
        submittedBy: user.uid,
        submittedByEmail: user.email,
        status: 'pending', // pending, approved, rejected
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0
      };

      await addDoc(collection(db, 'corrections'), correction);

      console.log('✅ Correction submitted');
      alert('Thank you! Your correction has been submitted for review.');
      onClose();

    } catch (error) {
      console.error('Error submitting correction:', error);
      alert('Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#141414] border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#D4AF37]">
              Suggest Correction
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Event Info */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-1">
              Event: {event.title}
            </h3>
            <p className="text-xs text-gray-500">
              {event.year} • {event.category}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Correction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type of Correction
              </label>
              <select
                value={correctionType}
                onChange={(e) => setCorrectionType(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="edit">Edit Existing Information</option>
                <option value="add">Add Missing Context</option>
                <option value="dispute">Dispute Accuracy</option>
              </select>
            </div>

            {/* Field to Correct */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Field to Correct
              </label>
              <select
                value={field}
                onChange={(e) => {
                  setField(e.target.value);
                  setOriginalValue(event[e.target.value] || '');
                }}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="description">Description</option>
                <option value="title">Title</option>
                <option value="date">Date</option>
                <option value="location">Location</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* Original Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Value
              </label>
              <div className="px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-400 text-sm">
                {event[field] || '(empty)'}
              </div>
            </div>

            {/* Proposed Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proposed Change *
              </label>
              <textarea
                value={proposedValue}
                onChange={(e) => setProposedValue(e.target.value)}
                placeholder="Enter your proposed correction..."
                required
                rows={4}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Explanation *
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explain why this correction is needed and provide evidence..."
                required
                rows={3}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            {/* Sources */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Supporting Sources (URLs)
              </label>
              <textarea
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                placeholder="https://example.com/source1&#10;https://example.com/source2"
                rows={3}
                className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Note:</strong> Corrections are reviewed by admins. Approved corrections increase both the event's credibility score and your contributor reputation.
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Correction'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

