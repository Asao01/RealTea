"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href) => pathname === href;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo - Left Side */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#E5C878] flex items-center justify-center shadow-sm">
              <span className="text-xl">☕</span>
            </div>
            <span className="text-xl font-bold text-white">RealTea</span>
          </Link>

          {/* Navigation Links - Center/Right Side */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-300 hover:text-[#D4AF37]'
              }`}
            >
              Home
            </Link>
            <Link 
              href="/timeline" 
              className={`text-sm font-medium transition-colors ${
                isActive('/timeline') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-700 hover:text-[#D4AF37]'
              }`}
            >
              Timeline
            </Link>
            <Link 
              href="/map" 
              className={`text-sm font-medium transition-colors ${
                isActive('/map') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-700 hover:text-[#D4AF37]'
              }`}
            >
              Map
            </Link>
            <Link 
              href="/today" 
              className={`text-sm font-medium transition-colors ${
                isActive('/today') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-700 hover:text-[#D4AF37]'
              }`}
            >
              Today
            </Link>
            <Link 
              href="/transparency" 
              className={`text-sm font-medium transition-colors ${
                isActive('/transparency') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-700 hover:text-[#D4AF37]'
              }`}
            >
              Transparency
            </Link>
            <Link 
              href="/about" 
              className={`text-sm font-medium transition-colors ${
                isActive('/about') 
                  ? 'text-[#D4AF37] font-semibold' 
                  : 'text-gray-700 hover:text-[#D4AF37]'
              }`}
            >
              About
            </Link>
          </div>

          {/* Login/User - Right Side */}
          <div className="hidden md:block">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{user.email}</span>
                <button 
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login">
                <button className="px-4 py-2 text-sm font-medium text-white bg-[#D4AF37] rounded-lg hover:bg-[#E5C878] transition">
                  Login
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800">
          <div className="px-6 py-4 space-y-3">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/') ? 'text-[#D4AF37]' : 'text-gray-300'
              }`}
            >
              Home
            </Link>
            <Link 
              href="/timeline" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/timeline') ? 'text-[#D4AF37]' : 'text-gray-700'
              }`}
            >
              Timeline
            </Link>
            <Link 
              href="/map" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/map') ? 'text-[#D4AF37]' : 'text-gray-700'
              }`}
            >
              Map
            </Link>
            <Link 
              href="/today" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/today') ? 'text-[#D4AF37]' : 'text-gray-700'
              }`}
            >
              Today
            </Link>
            <Link 
              href="/transparency" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/transparency') ? 'text-[#D4AF37]' : 'text-gray-700'
              }`}
            >
              Transparency
            </Link>
            <Link 
              href="/about" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`block py-2 text-sm font-medium ${
                isActive('/about') ? 'text-[#D4AF37]' : 'text-gray-700'
              }`}
            >
              About
            </Link>

            {/* Mobile Auth */}
            <div className="pt-4 border-t border-gray-800">
              {user ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">{user.email}</p>
                  <button 
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full px-4 py-2 text-sm font-medium text-white bg-[#D4AF37] rounded-lg hover:bg-[#E5C878] transition">
                    Login
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
