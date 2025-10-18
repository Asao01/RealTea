"use client";

import { createContext, useContext } from "react";

const PerformanceContext = createContext({
  performanceMode: false,
  togglePerformanceMode: () => {},
  shouldAnimate: true,
  shouldUseAI: true,
});

export function PerformanceProvider({ children }) {
  // Performance mode permanently disabled - all features always enabled
  const performanceMode = false;
  const shouldAnimate = true;
  const shouldUseAI = true;

  // No-op toggle function
  const togglePerformanceMode = () => {
    // Performance mode is disabled - no toggle allowed
  };

  const value = {
    performanceMode: false,
    togglePerformanceMode,
    shouldAnimate: true,
    shouldUseAI: true,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  return useContext(PerformanceContext);
}
