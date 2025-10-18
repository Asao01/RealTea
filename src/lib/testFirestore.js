/**
 * Firestore Connection Test Helper
 * This file tests the Firestore connection and logs results to console
 */

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Test Firestore connection by fetching all events
 * @returns {Promise<Object>} Connection test results
 */
export async function testFirestoreConnection() {
  console.log('🔍 Testing Firestore connection...');
  
  const results = {
    connected: false,
    error: null,
    eventCount: 0,
    events: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Check if db is initialized
    if (!db) {
      throw new Error('Firestore database not initialized. Check your .env.local file.');
    }

    console.log('✅ Firestore instance initialized');

    // Try to fetch from events collection
    const eventsRef = collection(db, 'events');
    console.log('📂 Fetching from "events" collection...');
    
    const querySnapshot = await getDocs(eventsRef);
    
    results.connected = true;
    results.eventCount = querySnapshot.size;
    
    // Log each document
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const event = {
        id: doc.id,
        title: data.title,
        year: data.date ? data.date.split('-')[0] : 'Unknown',
        category: data.category,
        description: data.description?.substring(0, 100) + '...' // First 100 chars
      };
      results.events.push(event);
      
      console.log(`📄 Event ${doc.id}:`, {
        title: data.title,
        year: event.year,
        category: data.category
      });
    });

    // Success message
    if (results.eventCount === 0) {
      console.log('⚠️ Firestore connected but no events found in the collection');
      console.log('💡 Add events via /submit or check your Firebase Console');
    } else {
      console.log(`✅ Successfully fetched ${results.eventCount} event(s) from Firestore`);
    }

    // Log Firebase project info
    console.log('🔧 Firebase Config:', {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not set'
    });

  } catch (error) {
    results.connected = false;
    results.error = error.message;
    
    console.error('❌ Firestore connection failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Provide helpful debugging info
    console.log('🔍 Debugging Info:');
    console.log('- Check that .env.local exists in realtea-timeline/ folder');
    console.log('- Verify all NEXT_PUBLIC_FIREBASE_* variables are set');
    console.log('- Ensure Firebase project "reality" is configured correctly');
    console.log('- Check Firebase Console: https://console.firebase.google.com/');
  }

  // Return results summary
  return results;
}

/**
 * Log Firestore configuration status
 */
export function logFirebaseConfig() {
  console.log('🔧 Firebase Configuration Check:');
  
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing'
  };

  console.table(config);
  
  const allSet = Object.values(config).every(v => v === '✅ Set' || (typeof v === 'string' && v !== '❌ Missing'));
  
  if (allSet) {
    console.log('✅ All Firebase environment variables are configured');
  } else {
    console.warn('⚠️ Some Firebase environment variables are missing');
    console.log('📝 Create or update .env.local with your Firebase credentials');
  }

  return config;
}

