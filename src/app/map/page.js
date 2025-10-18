"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Footer from "../../components/Footer";

/**
 * Map Page - Disabled/Coming Soon
 * Map functionality removed per cleanup requirements
 */
export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="text-8xl mb-6">🗺️</div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Map View Coming Soon
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            We're building an interactive global event map to visualize historical events geographically.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/timeline">
              <button className="px-8 py-4 bg-[#D4AF37] text-white font-semibold rounded-xl hover:bg-[#E5C878] transition-all shadow-lg">
                Explore Timeline Instead
              </button>
            </Link>
            <Link href="/">
              <button className="px-8 py-4 bg-gray-800 text-gray-300 font-semibold rounded-xl hover:bg-gray-700 border border-gray-700 transition-all">
                Back to Home
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}
