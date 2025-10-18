"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login, signup, loginWithGoogle, user, loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    // Validation for signup
    if (!isLogin) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.push("/");
    } catch (err) {
      // Parse Firebase error messages
      const errorMessage = err?.message || (isLogin ? "Login failed" : "Signup failed");
      if (errorMessage.includes("auth/invalid-email")) {
        setError("Invalid email address");
      } else if (errorMessage.includes("auth/user-not-found")) {
        setError("No account found with this email");
      } else if (errorMessage.includes("auth/wrong-password")) {
        setError("Incorrect password");
      } else if (errorMessage.includes("auth/email-already-in-use")) {
        setError("An account with this email already exists");
      } else if (errorMessage.includes("auth/weak-password")) {
        setError("Password is too weak");
      } else if (errorMessage.includes("auth/invalid-credential")) {
        setError("Invalid email or password");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }
  
  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    
    console.log('🔐 [LOGIN] Starting Google Sign-In test...');
    console.log('📍 [LOGIN] Current URL:', window.location.href);
    
    try {
      const result = await loginWithGoogle();
      
      console.log('✅ [LOGIN] Google Sign-In SUCCESSFUL!');
      console.log('👤 [LOGIN] User Name:', result.user?.displayName || 'No name');
      console.log('📧 [LOGIN] User Email:', result.user?.email || 'No email');
      console.log('🆔 [LOGIN] User ID:', result.user?.uid || 'No UID');
      console.log('✅ [LOGIN] Email Verified:', result.user?.emailVerified || false);
      
      alert(`✅ Logged in successfully as ${result.user?.displayName || result.user?.email}!`);
      
      router.push("/");
    } catch (err) {
      console.error('❌ [LOGIN] Google Sign-In FAILED!');
      console.error('📋 [LOGIN] Error Code:', err?.code || 'Unknown');
      console.error('📋 [LOGIN] Error Message:', err?.message || 'Unknown error');
      console.error('📋 [LOGIN] Full Error:', err);
      
      const errorMessage = err?.message || "Google login failed";
      
      if (err?.code === 'auth/popup-closed-by-user') {
        setError("❌ Login cancelled - You closed the popup");
      } else if (err?.code === 'auth/popup-blocked') {
        setError("❌ Popup blocked! Please allow popups for this site in browser settings.");
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError("❌ Domain not authorized! Add 'localhost' to Firebase Console → Authentication → Settings → Authorized domains");
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError("❌ Google Sign-In not enabled! Enable it in Firebase Console → Authentication → Sign-in method");
      } else {
        setError(`❌ Error: ${errorMessage}`);
      }
      
      // Show alert with detailed error
      alert(`❌ Google Sign-In Failed!\n\nError: ${err?.code || 'Unknown'}\n\nCheck browser console (F12) for details.`);
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setIsLogin(!isLogin);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  // Show loading state while checking if user is already logged in
  if (authLoading) {
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
                  Loading...
                </p>
              </div>
      </motion.div>
    );
  }

  // Don't render login form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="rounded-2xl border p-8 shadow-2xl bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <motion.h1 
            className="text-3xl font-bold mb-8 text-center"
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-accent-gradient">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </span>
          </motion.h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div 
              className="text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              {error}
            </motion.div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
              placeholder="••••••••"
            />
          </div>
          
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required
                className="w-full rounded-xl border px-4 py-3 text-base transition-all duration-500 focus:outline-none focus:ring-2 bg-gray-50 dark:bg-[#0d0d0d] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:border-gold-primary focus:ring-gold-primary/20"
                placeholder="••••••••"
              />
            </motion.div>
          )}
          
          <motion.button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
          </motion.button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
            className="w-full mt-4 px-6 py-3 text-base font-semibold rounded-xl border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-lg"
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? '🔄 Signing in...' : '🔐 Test Google Sign-In'}
          </motion.button>
          
          {/* Test Instructions */}
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-300 mb-2">
              <strong>🧪 Testing Google Sign-In:</strong>
            </p>
            <ol className="text-xs text-blue-200 space-y-1 ml-4 list-decimal">
              <li>Click the button above</li>
              <li>Google popup should open (not close instantly)</li>
              <li>Select your Google account</li>
              <li>Check browser console (F12) for logs</li>
              <li>Look for: "✅ Logged in as [your name]"</li>
            </ol>
            <p className="text-xs text-blue-300 mt-2">
              <strong>If popup closes instantly:</strong> Add 'localhost' to Firebase authorized domains
            </p>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={toggleMode}
              className="ml-2 font-semibold text-gold-primary hover:text-gold-secondary hover:underline transition-all duration-300"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
    </div>
  );
}


