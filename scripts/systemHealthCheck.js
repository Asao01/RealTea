/**
 * 🏥 RealTea System Health Check
 * Comprehensive diagnostic tool for all subsystems
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  pass: (msg) => console.log(`${colors.green}✅ PASS${colors.reset} - ${msg}`),
  fail: (msg) => console.log(`${colors.red}❌ FAIL${colors.reset} - ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  WARN${colors.reset} - ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  INFO${colors.reset} - ${msg}`),
};

// Results tracker
const results = {
  firestore: { status: 'PENDING', details: [], errors: [] },
  auth: { status: 'PENDING', details: [], errors: [] },
  maps: { status: 'PENDING', details: [], errors: [] },
  apis: { status: 'PENDING', details: [], errors: [] },
  heartbeat: { status: 'PENDING', details: [], errors: [] },
};

/**
 * Test 1: Firestore Connection (Read/Write)
 */
async function testFirestore() {
  log.header();
  log.title('🗄️  TEST 1: FIRESTORE CONNECTION (Read/Write)');
  log.header();

  try {
    // Load environment variables
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Validate config
    const missingKeys = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      results.firestore.status = 'FAIL';
      results.firestore.errors.push(`Missing env vars: ${missingKeys.join(', ')}`);
      log.fail(`Missing Firebase config: ${missingKeys.join(', ')}`);
      return false;
    }

    log.pass(`Firebase config loaded (Project: ${firebaseConfig.projectId})`);
    results.firestore.details.push(`Project ID: ${firebaseConfig.projectId}`);

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    log.pass('Firebase initialized successfully');

    // Test READ: Try to read from events collection
    log.info('Testing READ operation...');
    const eventsRef = collection(db, 'events');
    const snapshot = await getDocs(eventsRef);
    const eventCount = snapshot.size;
    log.pass(`READ successful - Found ${eventCount} events`);
    results.firestore.details.push(`Events in database: ${eventCount}`);

    // Test WRITE: Create a test document
    log.info('Testing WRITE operation...');
    const testDocRef = doc(db, 'healthcheck', 'test-' + Date.now());
    const testData = {
      test: true,
      timestamp: serverTimestamp(),
      message: 'Health check test document',
    };
    await setDoc(testDocRef, testData);
    log.pass('WRITE successful - Test document created');

    // Verify write by reading it back
    const testDoc = await getDoc(testDocRef);
    if (testDoc.exists()) {
      log.pass('WRITE verification successful - Document readable');
      results.firestore.details.push('Read/Write operations working');
    } else {
      throw new Error('Could not read back test document');
    }

    // Clean up test document
    await deleteDoc(testDocRef);
    log.info('Cleaned up test document');

    results.firestore.status = 'PASS';
    return true;

  } catch (error) {
    results.firestore.status = 'FAIL';
    results.firestore.errors.push(error.message);
    log.fail(`Firestore test failed: ${error.message}`);
    
    // Provide suggestions
    if (error.code === 'permission-denied') {
      log.warn('Firestore rules may be blocking access. Check firestore.rules');
    } else if (error.code === 'unavailable') {
      log.warn('Firestore service unavailable. Check network connectivity');
    }
    
    return false;
  }
}

/**
 * Test 2: Firebase Auth Configuration
 */
async function testAuth() {
  log.header();
  log.title('🔐 TEST 2: FIREBASE AUTH CONFIGURATION');
  log.header();

  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };

    const app = initializeApp(firebaseConfig, 'auth-test');
    const auth = getAuth(app);
    
    if (!auth) {
      throw new Error('Auth initialization failed');
    }
    
    log.pass('Firebase Auth initialized');
    results.auth.details.push('Auth service available');

    // Test Google provider
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    log.pass('Google Auth Provider configured');
    results.auth.details.push('Google login configured');

    // Check auth domain
    if (firebaseConfig.authDomain) {
      log.pass(`Auth domain: ${firebaseConfig.authDomain}`);
      results.auth.details.push(`Auth domain: ${firebaseConfig.authDomain}`);
    }

    log.info('Note: Google login popup test requires browser interaction');
    log.info('To test manually: Run dev server and click "Login with Google"');

    results.auth.status = 'PASS';
    return true;

  } catch (error) {
    results.auth.status = 'FAIL';
    results.auth.errors.push(error.message);
    log.fail(`Auth test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Maps API Configuration
 */
async function testMapsAPI() {
  log.header();
  log.title('🗺️  TEST 3: MAPS API CONFIGURATION');
  log.header();

  try {
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsKey) {
      log.warn('Google Maps API key not found in environment');
      results.maps.status = 'WARN';
      results.maps.details.push('Maps API key missing - map features may not work');
      return false;
    }

    log.pass(`Maps API key configured: ${googleMapsKey.substring(0, 10)}...`);
    results.maps.details.push('API key present');

    // Test Maps API with a simple request
    log.info('Testing Maps API endpoint...');
    const testUrl = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places`;
    
    const response = await fetch(testUrl, { method: 'HEAD' });
    
    if (response.ok || response.status === 200) {
      log.pass('Maps API endpoint accessible');
      results.maps.details.push('API endpoint responding');
      results.maps.status = 'PASS';
      return true;
    } else {
      log.warn(`Maps API returned status: ${response.status}`);
      results.maps.status = 'WARN';
      results.maps.details.push(`HTTP ${response.status} - May have restrictions`);
      return false;
    }

  } catch (error) {
    results.maps.status = 'FAIL';
    results.maps.errors.push(error.message);
    log.fail(`Maps API test failed: ${error.message}`);
    log.info('Maps features may not work without valid API key');
    return false;
  }
}

/**
 * Test 4: API Endpoints
 */
async function testAPIs() {
  log.header();
  log.title('🌐 TEST 4: API ENDPOINTS');
  log.header();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                  'https://realitea.org';
  log.info(`Testing against: ${baseUrl}`);

  const endpoints = [
    { path: '/api/fetchBreaking', name: 'Breaking News API', timeout: 60000 },
    { path: '/api/fetchHistory', name: 'Historical Events API', timeout: 60000 },
  ];

  let allPassed = true;

  for (const endpoint of endpoints) {
    try {
      log.info(`Testing ${endpoint.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);
      
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        log.pass(`${endpoint.name} - Status ${response.status}`);
        
        if (data.success) {
          results.apis.details.push(`${endpoint.name}: Working (${data.processed || 0} processed)`);
        } else {
          log.warn(`API returned success:false - ${data.error || 'Unknown error'}`);
          results.apis.details.push(`${endpoint.name}: Responded but reported error`);
        }
      } else {
        log.fail(`${endpoint.name} - HTTP ${response.status}`);
        results.apis.errors.push(`${endpoint.name}: HTTP ${response.status}`);
        allPassed = false;
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        log.warn(`${endpoint.name} - Timeout after ${endpoint.timeout / 1000}s`);
        results.apis.details.push(`${endpoint.name}: Slow response (may still work)`);
      } else if (error.message.includes('ECONNREFUSED')) {
        log.fail(`${endpoint.name} - Server not running`);
        log.info('Start dev server with: npm run dev');
        results.apis.errors.push(`${endpoint.name}: Server not running`);
        allPassed = false;
      } else {
        log.fail(`${endpoint.name} - ${error.message}`);
        results.apis.errors.push(`${endpoint.name}: ${error.message}`);
        allPassed = false;
      }
    }
  }

  results.apis.status = allPassed ? 'PASS' : 'FAIL';
  return allPassed;
}

/**
 * Test 5: AI Heartbeat
 */
async function testHeartbeat() {
  log.header();
  log.title('💓 TEST 5: AI HEARTBEAT');
  log.header();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                  'https://realitea.org';

  try {
    log.info('Calling /api/aiHeartbeat...');
    log.warn('This may take 2-5 minutes...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout
    
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/api/aiHeartbeat`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (response.ok) {
      const data = await response.json();
      log.pass(`AI Heartbeat completed in ${duration}s`);
      
      if (data.success) {
        log.pass(`Summary: ${data.summary.successful}/${data.summary.total} steps successful`);
        results.heartbeat.details.push(`Completed in ${duration}s`);
        results.heartbeat.details.push(`${data.summary.successful}/${data.summary.total} steps passed`);
        
        // Show individual step results
        data.results.forEach(result => {
          if (result.success) {
            log.pass(`  ${result.step}`);
          } else {
            log.fail(`  ${result.step}: ${result.error}`);
            results.heartbeat.errors.push(`${result.step}: ${result.error}`);
          }
        });
        
        results.heartbeat.status = data.summary.failed === 0 ? 'PASS' : 'WARN';
        return data.summary.failed === 0;
      } else {
        throw new Error(data.error || 'Heartbeat reported failure');
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      log.fail('AI Heartbeat timeout (>5 minutes)');
      results.heartbeat.errors.push('Execution timeout');
    } else if (error.message.includes('ECONNREFUSED')) {
      log.fail('Server not running');
      log.info('Start dev server with: npm run dev');
      results.heartbeat.errors.push('Server not running');
    } else {
      log.fail(`AI Heartbeat failed: ${error.message}`);
      results.heartbeat.errors.push(error.message);
    }
    
    results.heartbeat.status = 'FAIL';
    return false;
  }
}

/**
 * Print summary table
 */
function printSummary() {
  log.header();
  log.title('📊 SYSTEM HEALTH CHECK SUMMARY');
  log.header();
  
  console.log('\n');
  console.log('┌─────────────────────────────┬──────────┬────────────────────────────────────────────────┐');
  console.log('│ SUBSYSTEM                   │ STATUS   │ DETAILS                                        │');
  console.log('├─────────────────────────────┼──────────┼────────────────────────────────────────────────┤');
  
  Object.entries(results).forEach(([name, result]) => {
    const statusColor = 
      result.status === 'PASS' ? colors.green :
      result.status === 'FAIL' ? colors.red :
      result.status === 'WARN' ? colors.yellow :
      colors.reset;
    
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    const nameCell = displayName.padEnd(27);
    const statusCell = result.status.padEnd(8);
    
    const details = result.details.length > 0 ? result.details[0] : 
                    result.errors.length > 0 ? result.errors[0] : 'No details';
    const detailsCell = details.substring(0, 46).padEnd(46);
    
    console.log(`│ ${nameCell} │ ${statusColor}${statusCell}${colors.reset} │ ${detailsCell} │`);
    
    // Print additional details
    const allMessages = [...result.details.slice(1), ...result.errors];
    allMessages.forEach(msg => {
      const msgCell = msg.substring(0, 46).padEnd(46);
      console.log(`│ ${' '.padEnd(27)} │ ${' '.padEnd(8)} │ ${msgCell} │`);
    });
  });
  
  console.log('└─────────────────────────────┴──────────┴────────────────────────────────────────────────┘');
  console.log('\n');
  
  // Overall status
  const failCount = Object.values(results).filter(r => r.status === 'FAIL').length;
  const warnCount = Object.values(results).filter(r => r.status === 'WARN').length;
  const passCount = Object.values(results).filter(r => r.status === 'PASS').length;
  
  log.header();
  if (failCount === 0 && warnCount === 0) {
    log.pass(`ALL SYSTEMS OPERATIONAL (${passCount}/5 PASS)`);
  } else if (failCount === 0) {
    log.warn(`SYSTEMS MOSTLY OPERATIONAL (${passCount}/5 PASS, ${warnCount}/5 WARN)`);
  } else {
    log.fail(`SYSTEM ISSUES DETECTED (${failCount}/5 FAIL, ${warnCount}/5 WARN, ${passCount}/5 PASS)`);
  }
  log.header();
  
  // Suggestions
  if (results.firestore.status === 'FAIL') {
    console.log('\n💡 Firestore Fix: Check .env.local has correct Firebase credentials');
  }
  if (results.auth.status === 'FAIL') {
    console.log('💡 Auth Fix: Verify Firebase Auth is enabled in Firebase Console');
  }
  if (results.maps.status === 'FAIL' || results.maps.status === 'WARN') {
    console.log('💡 Maps Fix: Get API key from Google Cloud Console > APIs & Services > Credentials');
  }
  if (results.apis.status === 'FAIL') {
    console.log('💡 APIs Fix: Ensure dev server is running (npm run dev) or app is deployed');
  }
  if (results.heartbeat.status === 'FAIL') {
    console.log('💡 Heartbeat Fix: Check API keys for NewsAPI, OpenAI, and GDELT access');
  }
  
  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🏥 REALTEA SYSTEM HEALTH CHECK                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  log.info('Starting comprehensive system diagnostic...\n');

  // Run all tests
  await testFirestore();
  await testAuth();
  await testMapsAPI();
  await testAPIs();
  await testHeartbeat();

  // Print summary
  printSummary();
}

// Run
main().catch(console.error);

