"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";
import env from "../../../lib/env";
import Footer from "../../../components/Footer";

export default function DiagnosticsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [firestoreStatus, setFirestoreStatus] = useState('checking');
  const [authStatus, setAuthStatus] = useState('checking');
  const [pingResponse, setPingResponse] = useState(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  async function runDiagnostics() {
    // Check auth status
    auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthStatus(currentUser ? 'authenticated' : 'not-signed-in');
    });

    // Test Firestore connectivity
    try {
      if (!db) {
        setFirestoreStatus('error');
        return;
      }

      const eventsRef = collection(db, 'events');
      const testQuery = query(eventsRef, limit(1));
      await getDocs(testQuery);
      
      setFirestoreStatus('connected');
      console.log('✅ [DIAGNOSTICS] Firestore connectivity OK');
    } catch (error) {
      setFirestoreStatus('error');
      console.error('❌ [DIAGNOSTICS] Firestore error:', error);
    }

    // Ping auth endpoint
    try {
      const response = await fetch('/api/auth/ping');
      const data = await response.json();
      setPingResponse(data);
    } catch (error) {
      console.error('❌ [DIAGNOSTICS] Ping failed:', error);
    }
  }

  const envProblems = env.getProblems();
  const envWarnings = env.getWarnings();

  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <div className="max-w-4xl mx-auto px-4 py-20 mt-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-[#D4AF37] mb-4">
            🔧 System Diagnostics
          </h1>
          <p className="text-gray-400">
            Development environment health check
          </p>
        </motion.div>

        {/* Environment Variables */}
        <div className="space-y-6">
          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4">
              Environment Variables
            </h2>
            
            <div className="space-y-3">
              {envProblems.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">All required variables set</span>
                </div>
              ) : (
                <div>
                  <div className="text-red-400 font-medium mb-2">
                    ❌ Missing {envProblems.length} required variable{envProblems.length > 1 ? 's' : ''}:
                  </div>
                  {envProblems.map((p, i) => (
                    <div key={i} className="text-sm text-gray-400 ml-6 mb-1">
                      • {p.varName}
                    </div>
                  ))}
                </div>
              )}
              
              {envWarnings.length > 0 && (
                <div className="mt-4">
                  <div className="text-yellow-400 font-medium mb-2">
                    ⚠️ Optional variables not set ({envWarnings.length}):
                  </div>
                  {envWarnings.map((w, i) => (
                    <div key={i} className="text-sm text-gray-400 ml-6 mb-1">
                      • {w.varName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Firebase Status */}
          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4">
              Firebase Status
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Project ID:</span>
                <span className="text-gray-400 font-mono text-sm">
                  {env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Auth Domain:</span>
                <span className="text-gray-400 font-mono text-sm">
                  {env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NOT SET'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Firestore:</span>
                <span className={`font-medium ${
                  firestoreStatus === 'connected' ? 'text-green-400' :
                  firestoreStatus === 'checking' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {firestoreStatus === 'connected' ? '✅ Connected' :
                   firestoreStatus === 'checking' ? '⏳ Checking...' :
                   '❌ Error'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Auth Status:</span>
                <span className={`font-medium ${
                  authStatus === 'authenticated' ? 'text-green-400' :
                  authStatus === 'checking' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {authStatus === 'authenticated' ? `✅ ${user?.email}` :
                   authStatus === 'checking' ? '⏳ Checking...' :
                   '🔓 Not signed in'}
                </span>
              </div>
            </div>
          </div>

          {/* API Ping */}
          {pingResponse && (
            <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-[#D4AF37] mb-4">
                API Health Check
              </h2>
              
              <pre className="bg-[#0b0b0b] border border-gray-800 rounded p-4 text-xs text-gray-400 overflow-auto">
                {JSON.stringify(pingResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Firebase Setup Instructions */}
          {envProblems.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h2 className="text-xl font-bold text-red-400 mb-4">
                🔧 Setup Required
              </h2>
              
              <div className="space-y-3 text-sm text-red-200">
                <p>
                  <strong>1. Create .env.local file</strong> in project root
                </p>
                <p>
                  <strong>2. Add Firebase credentials from:</strong>
                  <br />
                  <a 
                    href="https://console.firebase.google.com" 
                    target="_blank"
                    className="text-red-300 underline hover:text-red-200"
                  >
                    Firebase Console → Your Project → Settings → Web App
                  </a>
                </p>
                <p>
                  <strong>3. Add these lines:</strong>
                </p>
                <pre className="bg-black/30 border border-red-500/20 rounded p-3 text-xs text-red-300 overflow-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc...`}
                </pre>
                <p>
                  <strong>4. Restart server:</strong> Ctrl+C then <code className="bg-black/30 px-2 py-1 rounded">npm run dev</code>
                </p>
              </div>
            </div>
          )}

          {/* Authorized Domains Check */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h2 className="text-xl font-bold text-blue-300 mb-4">
              📝 Firebase Authorized Domains
            </h2>
            
            <div className="space-y-3 text-sm text-blue-200">
              <p>
                For Google login to work, add these domains in Firebase Console:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-black/30 px-2 py-0.5 rounded">localhost</code> (no port)</li>
                <li><code className="bg-black/30 px-2 py-0.5 rounded">127.0.0.1</code></li>
                <li>Your Vercel domain (when deploying)</li>
              </ul>
              <p className="mt-3">
                <strong>Go to:</strong>
                <br />
                <a 
                  href={`https://console.firebase.google.com/project/${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/settings`}
                  target="_blank"
                  className="text-blue-300 underline hover:text-blue-200"
                >
                  Firebase Console → Authentication → Settings → Authorized domains
                </a>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#141414] border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4">
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => window.open('/api/auth/ping', '_blank')}
                className="px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-[#D4AF37] transition-colors text-sm"
              >
                Test API Ping
              </button>
              
              <button
                onClick={() => window.open('/api/generateDiverseEvents', '_blank')}
                className="px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-[#D4AF37] transition-colors text-sm"
              >
                Generate Sample Events
              </button>
              
              <button
                onClick={runDiagnostics}
                className="px-4 py-2 bg-[#D4AF37] text-[#0b0b0b] font-semibold rounded-lg hover:bg-[#E5C878] transition-colors text-sm"
              >
                🔄 Refresh Diagnostics
              </button>
              
              <button 
                onClick={() => router.push('/login')}
                className="w-full px-4 py-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 rounded-lg hover:border-[#D4AF37] transition-colors text-sm"
              >
                Test Google Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

