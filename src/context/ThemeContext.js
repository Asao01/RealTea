"use client";

import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext({ theme: "dark", toggle: () => {}, isDark: true });

export function ThemeProvider({ children }) {
  // Permanently locked to dark mode - no toggle
  const theme = "dark";
  const isDark = true;

  useEffect(() => {
    // Force dark mode on mount and lock it
    const root = document.documentElement;
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    localStorage.setItem('theme', 'dark');
    
    // Set dark background color
    document.body.style.backgroundColor = '#0d1117';
  }, []);

  // No-op toggle function
  const toggle = () => {
    // Theme is locked to dark - no toggle allowed
  };

  const setTheme = () => {
    // Theme is locked to dark - no setter allowed
  };

  const value = {
    theme: 'dark',
    isDark: true,
    toggle,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
