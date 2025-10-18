"use client";

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('❌ [ErrorBoundary] Caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl"
          >
            <div className="text-8xl mb-6">⚠️</div>
            <h1 className="text-4xl font-bold text-[#e5e5e5] mb-4">
              Something went wrong
            </h1>
            <p className="text-lg text-gray-400 mb-6">
              {this.props.errorMessage || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            
            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm overflow-auto max-h-64">
                <summary className="cursor-pointer font-semibold mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-4 justify-center mt-8">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#D4AF37] text-[#0b0b0b] font-bold rounded-lg hover:bg-[#E5C878] transition-all duration-300"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-all duration-300"
              >
                Go Home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // No error, render children
    return this.props.children;
  }
}

/**
 * Functional wrapper component for easier usage
 */
export function withErrorBoundary(Component, errorMessage) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary errorMessage={errorMessage}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;

