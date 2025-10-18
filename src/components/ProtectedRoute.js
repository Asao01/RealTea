"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <motion.div 
        className="flex items-center justify-center min-h-[60vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center">
          <motion.div
            className="inline-block h-12 w-12 rounded-full border-4 border-t-transparent border-gold-primary"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Verifying authentication...
          </p>
        </div>
      </motion.div>
    );
  }

  // Don't render anything if user is not authenticated
  // (redirect will happen via useEffect)
  if (!user) {
    return null;
  }

  // Render protected content with fade-in animation
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}


