"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (href) => pathname === href;

  // Scroll detection for transparent-to-solid effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-gray-900/98 backdrop-blur-md border-b border-gray-800 shadow-2xl' 
          : 'bg-transparent backdrop-blur-sm border-b border-gray-800/50 shadow-lg'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo - Left Side */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] via-[#E5C878] to-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 group-hover:shadow-[#D4AF37]/40 transition-all"
            >
              <span className="text-xl sm:text-2xl">☕</span>
            </motion.div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                RealTea
              </span>
              <p className="text-[10px] text-gray-500 -mt-1 tracking-wide">Reality Receipts</p>
            </div>
            <span className="sm:hidden text-lg font-bold text-white">RealTea</span>
          </Link>

          {/* Navigation Links - Center/Right Side */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {[
              { href: '/', label: 'Home' },
              { href: '/timeline', label: 'Timeline' },
              { href: '/today', label: 'Today' },
              { href: '/transparency', label: 'Transparency' },
              { href: '/about', label: 'About' }
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 border border-[#D4AF37]/30'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Login/User - Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center text-xs font-bold text-gray-900">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm text-gray-300 max-w-[120px] truncate">{user.email}</span>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all"
                >
                  Logout
                </motion.button>
              </>
            ) : (
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 py-2 text-sm font-semibold text-gray-900 bg-gradient-to-r from-[#D4AF37] to-[#E5C878] rounded-lg shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all"
                >
                  Login
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              ) : (
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              )}
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-lg border-t border-gray-800 absolute top-full left-0 right-0 z-[60] shadow-2xl overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
              className="px-4 py-4 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto"
            >
              {[
                { href: '/', label: 'Home', icon: '🏠' },
                { href: '/timeline', label: 'Timeline', icon: '📅' },
                { href: '/today', label: 'Today', icon: '⭐' },
                { href: '/transparency', label: 'Transparency', icon: '🔍' },
                { href: '/about', label: 'About', icon: 'ℹ️' }
              ].map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isActive(item.href)
                          ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 shadow-lg shadow-[#D4AF37]/10'
                          : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive(item.href) && (
                        <motion.div
                          layoutId="mobile-active-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              ))}

              {/* Mobile Auth */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4 mt-4 border-t border-gray-800"
              >
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center text-sm font-bold text-gray-900">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm text-gray-300 flex-1 truncate">{user.email}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all"
                    >
                      Logout
                    </motion.button>
                  </div>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-4 py-3 text-sm font-semibold text-gray-900 bg-gradient-to-r from-[#D4AF37] to-[#E5C878] rounded-lg shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-all"
                    >
                      Login
                    </motion.button>
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
