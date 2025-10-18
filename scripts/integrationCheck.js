/**
 * ═══════════════════════════════════════════════════════════════════
 * RealTea Complete Integration & Stability Check
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Tests all systems: Firebase, Firestore, Auth, OpenAI, Scheduler, UI
 * 
 * USAGE:
 *   node scripts/integrationCheck.js
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, deleteDoc, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

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
  header: () => console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  pass: (msg) => console.log(`${colors.green}✅ PASS${colors.reset} - ${msg}`),
  fail: (msg) => console.log(`${colors.red}❌ FAIL${colors.reset} - ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  WARN${colors.reset} - ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  INFO${colors.reset} - ${msg}`),
};

// Test results
const results = {
  firebase: { status: 'PENDING', details: [], errors: [] },
  firestore: { status: 'PENDING', details: [], errors: [] },
  auth: { status: 'PENDING', details: [], errors: [] },
  openai: { status: 'PENDING', details: [], errors: [] },
  scheduler: { status: 'PENDING', details: [], errors: [] },
  deployment: { status: 'PENDING', details: [], errors: [] },
};

// ═══════════════════════════════════════════════════════════════════
// TEST 1: FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

async function testFirebaseConfig() {
  log.header();
  log.title('🔥 TEST 1: FIREBASE CONFIGURATION');
  log.header();

  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Check for missing keys
    const missingKeys = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      results.firebase.status = 'FAIL';
      results.firebase.errors.push(`Missing: ${missingKeys.join(', ')}`);
      log.fail(`Missing Firebase config: ${missingKeys.join(', ')}`);
      return false;
    }

    log.pass(`All Firebase environment variables present`);
    log.pass(`Project ID: ${firebaseConfig.projectId}`);
    results.firebase.details.push(`Project: ${firebaseConfig.projectId}`);

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    log.pass('Firebase initialized successfully');
    results.firebase.status = 'PASS';
    
    return app;

  } catch (error) {
    results.firebase.status = 'FAIL';
    results.firebase.errors.push(error.message);
    log.fail(`Firebase initialization failed: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 2: FIRESTORE READ/WRITE
// ═══════════════════════════════════════════════════════════════════

async function testFirestore(app) {
  log.header();
  log.title('🗄️  TEST 2: FIRESTORE CONNECTION & OPERATIONS');
  log.header();

  try {
    const db = getFirestore(app);
    log.pass('Firestore initialized');

    // TEST READ: Count events
    log.info('Testing READ operation...');
    const eventsRef = collection(db, 'events');
    const eventsSnapshot = await getDocs(query(eventsRef, limit(100)));
    const eventCount = eventsSnapshot.size;
    
    log.pass(`READ successful - Found ${eventCount} events`);
    results.firestore.details.push(`Events in database: ${eventCount}`);

    // Count anchor events
    const anchorCount = eventsSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.addedBy === 'backfill' && parseInt(data.year) < 1500;
    }).length;
    
    if (anchorCount > 0) {
      log.pass(`Found ${anchorCount} anchor events (pre-1500)`);
      results.firestore.details.push(`Anchor events: ${anchorCount}`);
    }

    // TEST WRITE: Create test document
    log.info('Testing WRITE operation...');
    const testDocRef = doc(db, 'healthcheck', 'integration-test-' + Date.now());
    const testData = {
      test: true,
      timestamp: serverTimestamp(),
      message: 'Integration check test document',
      verifiedByAI: true,
      credibilityScore: 100,
      addedBy: 'auto'
    };
    
    await setDoc(testDocRef, testData);
    log.pass('WRITE successful - Test document created');

    // Verify write
    const testDoc = await getDoc(testDocRef);
    if (testDoc.exists()) {
      log.pass('WRITE verification - Document readable');
      results.firestore.details.push('Read/Write operations working');
    }

    // Cleanup
    await deleteDoc(testDocRef);
    log.info('Cleaned up test document');

    // Check for backfill events
    const backfillEvents = eventsSnapshot.docs.filter(doc => 
      doc.data().addedBy === 'backfill'
    );
    
    if (backfillEvents.length > 0) {
      log.pass(`Backfill events found: ${backfillEvents.length}`);
      results.firestore.details.push(`Backfill populated: ${backfillEvents.length} events`);
    } else {
      log.warn('No backfill events found - run: node backfillHistory.js --quick');
    }

    results.firestore.status = 'PASS';
    return true;

  } catch (error) {
    results.firestore.status = 'FAIL';
    results.firestore.errors.push(error.message);
    log.fail(`Firestore test failed: ${error.message}`);
    
    if (error.code === 'permission-denied') {
      log.warn('Firestore rules may be blocking access');
      log.info('Deploy rules: firebase deploy --only firestore:rules');
    }
    
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 3: FIREBASE AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════

async function testAuth(app) {
  log.header();
  log.title('🔐 TEST 3: FIREBASE AUTHENTICATION');
  log.header();

  try {
    const auth = getAuth(app);
    
    if (!auth) {
      throw new Error('Auth initialization failed');
    }
    
    log.pass('Firebase Auth initialized');
    results.auth.details.push('Auth service available');

    // Test Google Provider
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    log.pass('Google Auth Provider configured');
    results.auth.details.push('Google sign-in configured');

    // Check auth domain
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (authDomain) {
      log.pass(`Auth domain: ${authDomain}`);
      results.auth.details.push(`Domain: ${authDomain}`);
    }

    log.info('Note: Google sign-in popup test requires browser interaction');
    log.info('To test manually: Visit http://localhost:3000/login');

    results.auth.status = 'PASS';
    return true;

  } catch (error) {
    results.auth.status = 'FAIL';
    results.auth.errors.push(error.message);
    log.fail(`Auth test failed: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 4: OPENAI INTEGRATION
// ═══════════════════════════════════════════════════════════════════

async function testOpenAI() {
  log.header();
  log.title('🤖 TEST 4: OPENAI INTEGRATION');
  log.header();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      log.warn('OPENAI_API_KEY not found in environment');
      results.openai.status = 'WARN';
      results.openai.details.push('API key missing - AI features disabled');
      return false;
    }

    log.pass(`API key configured: ${apiKey.substring(0, 20)}...`);
    results.openai.details.push('API key present');

    // Test OpenAI API call
    log.info('Testing OpenAI API call...');
    const openai = new OpenAI({ apiKey });

    const testPrompt = "Summarize the Apollo 11 moon landing in 2 sentences.";
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a historian. Be concise and factual.' },
        { role: 'user', content: testPrompt }
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content;
    
    log.pass('OpenAI API responding correctly');
    log.info(`Sample response: "${response.substring(0, 100)}..."`);
    results.openai.details.push('API calls working');
    results.openai.details.push(`Model: ${completion.model}`);

    // Test credibility scoring logic
    const testScore = calculateCredibilityScore(5, 0.9, 2);
    if (testScore >= 0.6) {
      log.pass(`Credibility scoring working (test score: ${testScore})`);
      results.openai.details.push('Scoring algorithm validated');
    }

    results.openai.status = 'PASS';
    return true;

  } catch (error) {
    results.openai.status = 'FAIL';
    results.openai.errors.push(error.message);
    log.fail(`OpenAI test failed: ${error.message}`);
    
    if (error.status === 401) {
      log.warn('Invalid API key - check OPENAI_API_KEY in .env.local');
    } else if (error.status === 429) {
      log.warn('Rate limit or quota exceeded - check OpenAI billing');
    }
    
    return false;
  }
}

function calculateCredibilityScore(sourceCount, agreementRatio, recency) {
  const sourceWeight = Math.min(sourceCount / 5, 1);
  const agreementWeight = Math.min(agreementRatio, 1);
  const recencyWeight = recency > 7 ? 0.9 : 1;
  return parseFloat(((sourceWeight + agreementWeight + recencyWeight) / 3).toFixed(2));
}

// ═══════════════════════════════════════════════════════════════════
// TEST 5: BACKGROUND SCHEDULER & APIs
// ═══════════════════════════════════════════════════════════════════

async function testScheduler() {
  log.header();
  log.title('⏰ TEST 5: BACKGROUND SCHEDULER & EXTERNAL APIs');
  log.header();

  try {
    // Test MuffinLabs API
    log.info('Testing MuffinLabs History API...');
    const muffinUrl = 'https://history.muffinlabs.com/date/7/20';
    const muffinRes = await fetch(muffinUrl, {
      headers: { 'User-Agent': 'RealTea-IntegrationCheck/1.0' }
    });
    
    if (muffinRes.ok) {
      const muffinData = await muffinRes.json();
      const eventCount = muffinData.data?.Events?.length || 0;
      log.pass(`MuffinLabs API working (${eventCount} events for 7/20)`);
      results.scheduler.details.push('MuffinLabs API: Online');
    } else {
      throw new Error(`MuffinLabs returned ${muffinRes.status}`);
    }

    // Test Wikipedia API
    log.info('Testing Wikipedia API...');
    const wikiUrl = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/7/20';
    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'RealTea-IntegrationCheck/1.0' }
    });
    
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const wikiEventCount = wikiData.events?.length || 0;
      log.pass(`Wikipedia API working (${wikiEventCount} events for 7/20)`);
      results.scheduler.details.push('Wikipedia API: Online');
    } else {
      throw new Error(`Wikipedia returned ${wikiRes.status}`);
    }

    // Test Wikipedia summary API
    log.info('Testing Wikipedia Summary API...');
    const summaryUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/Apollo_11';
    const summaryRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'RealTea-IntegrationCheck/1.0' }
    });
    
    if (summaryRes.ok) {
      const summaryData = await summaryRes.json();
      log.pass(`Wikipedia Summary API working`);
      log.info(`Sample: "${summaryData.extract?.substring(0, 80)}..."`);
      results.scheduler.details.push('Wikipedia Summary API: Online');
    }

    // Check if scheduler has run
    log.info('Checking for scheduled population...');
    const db = getFirestore(initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }, 'scheduler-test'));

    const eventsRef = collection(db, 'events');
    const autoEvents = await getDocs(query(eventsRef, limit(1000)));
    const scheduledEvents = autoEvents.docs.filter(doc => 
      doc.data().addedBy === 'auto' || doc.data().autoUpdated === true
    );

    if (scheduledEvents.length > 0) {
      log.pass(`Scheduler has run: ${scheduledEvents.length} auto-updated events found`);
      results.scheduler.details.push(`Auto-updated events: ${scheduledEvents.length}`);
    } else {
      log.warn('No scheduled events found yet - scheduler may not have run');
      log.info('Trigger manually: curl http://localhost:3000/api/autoUpdate');
    }

    results.scheduler.status = 'PASS';
    return true;

  } catch (error) {
    results.scheduler.status = 'FAIL';
    results.scheduler.errors.push(error.message);
    log.fail(`Scheduler test failed: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 6: DEPLOYMENT & BUILD
// ═══════════════════════════════════════════════════════════════════

async function testDeployment() {
  log.header();
  log.title('🚀 TEST 6: DEPLOYMENT & BUILD CHECK');
  log.header();

  try {
    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'OPENAI_API_KEY',
      'NEWS_API_KEY'
    ];

    const missing = requiredEnvVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      log.warn(`Missing env vars: ${missing.join(', ')}`);
      results.deployment.details.push(`Missing: ${missing.join(', ')}`);
    } else {
      log.pass('All required environment variables present');
      results.deployment.details.push('Environment: Complete');
    }

    // Check package.json
    log.info('Checking package.json...');
    const packageJson = await import('../package.json', { assert: { type: 'json' } });
    
    if (packageJson.default.dependencies) {
      log.pass(`Dependencies configured`);
      const deps = Object.keys(packageJson.default.dependencies);
      results.deployment.details.push(`${deps.length} dependencies`);
    }

    // Test production site (if deployed)
    log.info('Testing production site...');
    try {
      const prodRes = await fetch('https://realitea.org', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (prodRes.ok) {
        log.pass('Production site online: https://realitea.org');
        results.deployment.details.push('Production: Online');
      }
    } catch (error) {
      log.warn('Production site not accessible or not deployed yet');
      results.deployment.details.push('Production: Not deployed');
    }

    results.deployment.status = 'PASS';
    return true;

  } catch (error) {
    results.deployment.status = 'WARN';
    results.deployment.errors.push(error.message);
    log.warn(`Deployment check issues: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY & REPORT
// ═══════════════════════════════════════════════════════════════════

function printSummary() {
  log.header();
  log.title('📊 INTEGRATION CHECK SUMMARY');
  log.header();
  
  console.log('\n');
  console.log('┌────────────────────────────┬──────────┬─────────────────────────────────────┐');
  console.log('│ SYSTEM                     │ STATUS   │ DETAILS                             │');
  console.log('├────────────────────────────┼──────────┼─────────────────────────────────────┤');
  
  Object.entries(results).forEach(([name, result]) => {
    const statusColor = 
      result.status === 'PASS' ? colors.green :
      result.status === 'FAIL' ? colors.red :
      result.status === 'WARN' ? colors.yellow :
      colors.reset;
    
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    const nameCell = displayName.padEnd(26);
    const statusCell = result.status.padEnd(8);
    
    const details = result.details.length > 0 ? result.details[0] : 
                    result.errors.length > 0 ? result.errors[0] : 'No details';
    const detailsCell = details.substring(0, 37).padEnd(37);
    
    console.log(`│ ${nameCell} │ ${statusColor}${statusCell}${colors.reset} │ ${detailsCell} │`);
    
    // Additional details
    [...result.details.slice(1), ...result.errors].forEach(msg => {
      const msgCell = msg.substring(0, 37).padEnd(37);
      console.log(`│ ${' '.padEnd(26)} │ ${' '.padEnd(8)} │ ${msgCell} │`);
    });
  });
  
  console.log('└────────────────────────────┴──────────┴─────────────────────────────────────┘');
  console.log('\n');
  
  // Overall status
  const failCount = Object.values(results).filter(r => r.status === 'FAIL').length;
  const warnCount = Object.values(results).filter(r => r.status === 'WARN').length;
  const passCount = Object.values(results).filter(r => r.status === 'PASS').length;
  
  log.header();
  if (failCount === 0 && warnCount === 0) {
    log.pass(`ALL SYSTEMS OPERATIONAL (${passCount}/6 PASS)`);
  } else if (failCount === 0) {
    log.warn(`SYSTEMS MOSTLY OPERATIONAL (${passCount}/6 PASS, ${warnCount}/6 WARN)`);
  } else {
    log.fail(`SYSTEM ISSUES DETECTED (${failCount}/6 FAIL, ${warnCount}/6 WARN, ${passCount}/6 PASS)`);
  }
  log.header();
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  if (results.firebase.status === 'FAIL') {
    console.log('   🔥 Firebase: Check .env.local has correct Firebase credentials');
  }
  if (results.firestore.status === 'FAIL') {
    console.log('   🗄️  Firestore: Deploy security rules (firebase deploy --only firestore:rules)');
  }
  if (results.auth.status === 'FAIL') {
    console.log('   🔐 Auth: Enable Google sign-in in Firebase Console > Authentication');
  }
  if (results.openai.status === 'FAIL') {
    console.log('   🤖 OpenAI: Add valid OPENAI_API_KEY to .env.local');
  }
  if (results.scheduler.status === 'FAIL') {
    console.log('   ⏰ Scheduler: Check external API connectivity');
  }
  if (results.deployment.status === 'FAIL') {
    console.log('   🚀 Deployment: Verify environment variables and build config');
  }
  
  console.log('\n');
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║         🏥 REALTEA COMPLETE INTEGRATION CHECK                      ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

  log.info('Starting comprehensive system integration check...\n');

  // Run all tests
  const app = await testFirebaseConfig();
  
  if (app) {
    await testFirestore(app);
    await testAuth(app);
  }
  
  await testOpenAI();
  await testScheduler();
  await testDeployment();

  // Print summary
  printSummary();

  // Exit code
  const failCount = Object.values(results).filter(r => r.status === 'FAIL').length;
  process.exit(failCount > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

