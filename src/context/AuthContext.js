"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut 
} from "firebase/auth";

const AuthContext = createContext({ 
  user: null, 
  loading: true, 
  login: async () => {}, 
  signup: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {} 
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signup: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    loginWithGoogle: async () => {
      console.log('🔐 [AUTH] Starting Google login with popup...');
      const provider = new GoogleAuthProvider();
      
      // Add custom parameters to keep popup open
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      try {
        const result = await signInWithPopup(auth, provider);
        console.log('✅ [AUTH] Google login successful:', result.user.email);
        
        // Initialize user stats if first time
        if (result.user && db) {
          try {
            const userStatsRef = doc(db, 'userStats', result.user.uid);
            const userStatsSnap = await getDoc(userStatsRef);
            
            if (!userStatsSnap.exists()) {
              await setDoc(userStatsRef, {
                userId: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName || 'Anonymous',
                emailVerified: result.user.emailVerified || false,
                photoURL: result.user.photoURL || '',
                totalVotes: 0,
                alignedVotes: 0,
                approvedCorrections: 0,
                flaggedContent: 0,
                lowCredibilityUpvotes: 0,
                recentVotes: [],
                cachedTrustScore: 50,
                createdAt: serverTimestamp(),
                lastVoteAt: null,
                lastLoginAt: serverTimestamp()
              });
              console.log('✅ [AUTH] Created user stats for new user');
            } else {
              // Update last login
              await setDoc(userStatsRef, {
                lastLoginAt: serverTimestamp()
              }, { merge: true });
            }
          } catch (statsError) {
            console.error('⚠️ [AUTH] Could not create user stats:', statsError);
          }
        }
        
        return result;
      } catch (error) {
        console.error('❌ [AUTH] Google login error:', error);
        console.error('📋 [AUTH] Error details:', {
          code: error.code,
          message: error.message
        });
        
        // Provide helpful error messages
        if (error.code === 'auth/unauthorized-domain') {
          console.error('💡 [AUTH] Domain not authorized. Add localhost:3000 to Firebase Console → Authentication → Settings → Authorized domains');
        } else if (error.code === 'auth/popup-blocked') {
          console.error('💡 [AUTH] Popup was blocked by browser. Allow popups for this site.');
        } else if (error.code === 'auth/popup-closed-by-user') {
          console.warn('⚠️ [AUTH] User closed the popup');
        }
        
        throw error;
      }
    },
    logout: async () => {
      await signOut(auth);
    },
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


