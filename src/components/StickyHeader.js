"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function StickyHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/timeline", label: "Timeline" },
    { href: "/today", label: "Today" },
    { href: "/transparency", label: "Transparency" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'glass-strong shadow-xl' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
                <span className="text-2xl">☕</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#E5C878] to-[#D4AF37] bg-clip-text text-transparent">
                  RealTea
                </h1>
                <p className="text-xs text-gray-400">Reality in Motion</p>
              </div>
            </motion.div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 md:gap-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#0b0b0b] shadow-lg shadow-[#D4AF37]/30'
                        : 'text-gray-400 hover:text-[#D4AF37] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {item.label}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Auth/Settings */}
          <div className="flex items-center gap-2">
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 md:px-4 py-2 rounded-lg bg-[#1a1a1a] border border-gray-700 text-gray-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 text-sm font-medium"
              >
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

