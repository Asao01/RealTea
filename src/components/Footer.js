"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative bg-black border-t border-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
                <span className="text-2xl">☕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
                  RealTea
                </h3>
                <p className="text-xs text-gray-500">Reality Deserves Receipts</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              A dynamic timeline of world events from 1600 to present, powered by AI and real-time data.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-[#D4AF37] mb-4 uppercase tracking-wider">
              Explore
            </h4>
            <div className="space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/timeline", label: "Timeline" },
                { href: "/today", label: "Today in History" },
                { href: "/transparency", label: "Transparency" },
                { href: "/submit", label: "Submit Event" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-gray-400 hover:text-[#D4AF37] transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <h4 className="text-sm font-bold text-[#D4AF37] mb-4 uppercase tracking-wider">
              Built With
            </h4>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">▸</span>
                <span>Next.js 14</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">▸</span>
                <span>Firebase & Firestore</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">▸</span>
                <span>OpenAI GPT-4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">▸</span>
                <span>Leaflet Maps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#D4AF37]">▸</span>
                <span>Framer Motion</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                © 2025 RealTea. All rights reserved.
              </p>
            </div>

            {/* Powered By */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="group"
            >
              <p className="text-sm text-gray-600 group-hover:text-[#D4AF37] transition-all duration-300 cursor-default">
                <span className="font-semibold bg-gradient-to-r from-gray-600 to-gray-500 group-hover:from-[#D4AF37] group-hover:to-[#E5C878] bg-clip-text text-transparent">
                  RealTea — Reality in Motion
                </span>
                <span className="mx-2">|</span>
                <span className="text-xs">Powered by AI + Firebase</span>
              </p>
            </motion.div>

            {/* Social Links (Optional) */}
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#D4AF37] transition-colors duration-300"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#D4AF37] transition-colors duration-300"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

