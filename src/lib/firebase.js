/**
 * Firebase Singleton
 * Safe initialization with environment validation
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate config
let app = null;
let auth = null;
let provider = null;
let db = null;

if (typeof window !== 'undefined') {
  // Client-side only
  if (!firebaseConfig.apiKey) {
    console.error('❌ [FIREBASE] Missing API key!');
    console.error('💡 [FIREBASE] Create .env.local file with your Firebase credentials');
    console.error('📝 [FIREBASE] See .env.example for template');
  } else {
    console.log('🔥 [FIREBASE] Config detected:', {
      apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
      projectId: firebaseConfig.projectId
    });

    try {
      // Initialize Firebase singleton
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      
      // Export Firebase services
      auth = getAuth(app);
      provider = new GoogleAuthProvider();
      db = getFirestore(app);

      // Configure Google provider
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('✅ [FIREBASE] Initialized successfully');
    } catch (error) {
      console.error('❌ [FIREBASE] Initialization error:', error);
    }
  }
}

export { auth, db, provider };
export default app;

