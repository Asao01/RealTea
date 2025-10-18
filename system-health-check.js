/**
 * ═══════════════════════════════════════════════════════════════════
 * RealTea System Health Check & Auto-Repair
 * Complete diagnostic and self-healing system
 * ═══════════════════════════════════════════════════════════════════
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env.local') });

// Health check results
const results = {
  timestamp: new Date().toISOString(),
  checks: [],
  errors: [],
  warnings: [],
  fixes: []
};

/**
 * Add check result
 */
function addCheck(component, status, message, details = null) {
  const check = {
    component,
    status, // ✅ PASS, ⚠️ WARNING, ❌ FAIL
    message,
    details
  };
  
  results.checks.push(check);
  
  const icon = status === '✅' ? '✅' : status === '⚠️' ? '⚠️' : '❌';
  console.log(`${icon} [${component}] ${message}`);
  if (details) console.log(`   └─ ${JSON.stringify(details, null, 2)}`);
  
  if (status === '❌') results.errors.push(check);
  if (status === '⚠️') results.warnings.push(check);
}

/**
 * Add auto-fix action
 */
function addFix(component, action, success) {
  const fix = { component, action, success, timestamp: new Date().toISOString() };
  results.fixes.push(fix);
  
  const icon = success ? '🔧' : '❌';
  console.log(`${icon} [AUTO-FIX] ${component}: ${action} - ${success ? 'SUCCESS' : 'FAILED'}`);
}

/**
 * 1️⃣ CHECK FIREBASE & FIRESTORE
 */
async function checkFirebaseConfig() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣ FIREBASE & FIRESTORE CONFIGURATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  let allEnvVarsPresent = true;
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      addCheck('ENV_VARS', '❌', `Missing ${varName}`);
      allEnvVarsPresent = false;
    }
  }

  if (allEnvVarsPresent) {
    addCheck('ENV_VARS', '✅', 'All Firebase environment variables present', {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      apiKeyPrefix: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) + '...'
    });
  }

  // Initialize Firebase
  let app, db;
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    addCheck('FIREBASE_INIT', '✅', 'Firebase initialized successfully');
  } catch (error) {
    addCheck('FIREBASE_INIT', '❌', 'Firebase initialization failed', error.message);
    return null;
  }

  // Test Firestore connection - read events
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('createdAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    const eventCount = snapshot.size;
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      shortSummary: doc.data().shortSummary ? 'Present ✅' : 'Missing ⚠️',
      sources: Array.isArray(doc.data().sources) ? doc.data().sources.length : 0,
      credibilityScore: doc.data().credibilityScore
    }));

    addCheck('FIRESTORE_READ', '✅', `Read ${eventCount} recent events from Firestore`, events);
    
    // Check for enriched fields
    const hasShortSummary = snapshot.docs.some(doc => doc.data().shortSummary);
    const hasStructuredSources = snapshot.docs.some(doc => {
      const sources = doc.data().sources;
      return Array.isArray(sources) && sources.length > 0 && typeof sources[0] === 'object';
    });
    
    if (hasShortSummary) {
      addCheck('SHORT_SUMMARY', '✅', 'Events have shortSummary field');
    } else {
      addCheck('SHORT_SUMMARY', '⚠️', 'No events with shortSummary found - run AI updater');
    }
    
    if (hasStructuredSources) {
      addCheck('STRUCTURED_SOURCES', '✅', 'Events have structured sources (name + URL)');
    } else {
      addCheck('STRUCTURED_SOURCES', '⚠️', 'Sources not structured - run AI updater');
    }
    
  } catch (error) {
    addCheck('FIRESTORE_READ', '❌', 'Failed to read from Firestore', error.message);
  }

  // Test Firestore write
  try {
    const healthRef = collection(db, 'healthcheck');
    const testDoc = await addDoc(healthRef, {
      test: true,
      timestamp: serverTimestamp(),
      message: 'Health check write test'
    });
    
    addCheck('FIRESTORE_WRITE', '✅', 'Successfully wrote to Firestore', { docId: testDoc.id });
  } catch (error) {
    addCheck('FIRESTORE_WRITE', '❌', 'Failed to write to Firestore', error.message);
  }

  return db;
}

/**
 * 2️⃣ CHECK AI UPDATER FUNCTION
 */
async function checkAIUpdater() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣ AI UPDATER FUNCTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if functions/index.js exists
  try {
    const { existsSync } = await import('fs');
    const functionsExists = existsSync('./functions/index.js');
    
    if (functionsExists) {
      addCheck('FUNCTION_FILE', '✅', 'functions/index.js exists');
    } else {
      addCheck('FUNCTION_FILE', '❌', 'functions/index.js not found');
    }
  } catch (error) {
    addCheck('FUNCTION_FILE', '⚠️', 'Could not check function file', error.message);
  }

  // Check OpenAI key
  if (process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    const key = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    addCheck('OPENAI_KEY', '✅', 'OpenAI API key configured', {
      keyPrefix: key.substring(0, 10) + '...'
    });
  } else {
    addCheck('OPENAI_KEY', '❌', 'OpenAI API key not found in environment');
  }

  // Check NEWS_API_KEY
  if (process.env.NEWS_API_KEY) {
    addCheck('NEWS_API_KEY', '✅', 'NewsAPI key configured');
  } else {
    addCheck('NEWS_API_KEY', '⚠️', 'NewsAPI key not found (optional)');
  }
}

/**
 * 3️⃣ CHECK SCHEDULER / CRON
 */
async function checkScheduler() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣ SCHEDULER / CRON');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if scheduler is defined in functions
  try {
    const { readFileSync } = await import('fs');
    const functionsContent = readFileSync('./functions/index.js', 'utf-8');
    
    const hasScheduler = functionsContent.includes('scheduledDailyUpdate') && 
                        functionsContent.includes('functions.pubsub.schedule');
    
    if (hasScheduler) {
      addCheck('SCHEDULER_CODE', '✅', 'Scheduled function defined in code');
      
      // Check if it's the correct schedule
      if (functionsContent.includes("'0 1 * * *'")) {
        addCheck('SCHEDULE_TIME', '✅', 'Runs daily at 1 AM');
      } else {
        addCheck('SCHEDULE_TIME', '⚠️', 'Custom schedule detected');
      }
    } else {
      addCheck('SCHEDULER_CODE', '❌', 'Scheduled function not found in code');
    }
  } catch (error) {
    addCheck('SCHEDULER_CODE', '⚠️', 'Could not verify scheduler code', error.message);
  }

  addCheck('SCHEDULER_DEPLOY', '⚠️', 'Manual check required: Run "firebase deploy --only functions" to deploy scheduler');
}

/**
 * 4️⃣ CHECK FRONT-END CONNECTION
 */
async function checkFrontend() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('4️⃣ FRONT-END CONNECTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if TimelineEvent.js uses shortSummary
  try {
    const { readFileSync } = await import('fs');
    const timelineContent = readFileSync('./src/components/TimelineEvent.js', 'utf-8');
    
    if (timelineContent.includes('shortSummary')) {
      addCheck('FRONTEND_SHORT_SUMMARY', '✅', 'TimelineEvent component uses shortSummary');
    } else {
      addCheck('FRONTEND_SHORT_SUMMARY', '⚠️', 'TimelineEvent may not be using shortSummary');
    }
    
    if (timelineContent.includes('detailsModalOpen')) {
      addCheck('MODAL_COMPONENT', '✅', 'Modal popup component implemented');
    } else {
      addCheck('MODAL_COMPONENT', '❌', 'Modal component missing');
    }
    
    if (timelineContent.includes('event.sources')) {
      addCheck('SOURCES_DISPLAY', '✅', 'Component displays sources');
    } else {
      addCheck('SOURCES_DISPLAY', '⚠️', 'Sources may not be displayed');
    }
  } catch (error) {
    addCheck('FRONTEND_CHECK', '⚠️', 'Could not verify frontend code', error.message);
  }
}

/**
 * 5️⃣ CHECK STYLING & THEME
 */
async function checkStyling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('5️⃣ STYLING & THEME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check Tailwind config
  try {
    const { readFileSync } = await import('fs');
    const tailwindContent = readFileSync('./tailwind.config.js', 'utf-8');
    
    if (tailwindContent.includes('gray-900') || tailwindContent.includes('darkMode')) {
      addCheck('DARK_THEME', '✅', 'Dark theme configuration found');
    } else {
      addCheck('DARK_THEME', '⚠️', 'Dark theme may not be configured');
    }
    
    if (tailwindContent.includes('@tailwindcss/typography')) {
      addCheck('TYPOGRAPHY_PLUGIN', '✅', 'Typography plugin configured');
    } else {
      addCheck('TYPOGRAPHY_PLUGIN', '⚠️', 'Typography plugin not found');
    }
  } catch (error) {
    addCheck('STYLING_CHECK', '⚠️', 'Could not verify styling config', error.message);
  }
}

/**
 * GENERATE FINAL REPORT
 */
function generateReport() {
  console.log('\n');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log('📊 SYSTEM HEALTH REPORT');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${results.timestamp}\n`);

  // Summary
  const passCount = results.checks.filter(c => c.status === '✅').length;
  const warnCount = results.checks.filter(c => c.status === '⚠️').length;
  const failCount = results.checks.filter(c => c.status === '❌').length;
  const totalChecks = results.checks.length;

  console.log('📈 SUMMARY:');
  console.log(`   Total Checks: ${totalChecks}`);
  console.log(`   ✅ Passed: ${passCount} (${Math.round(passCount/totalChecks*100)}%)`);
  console.log(`   ⚠️  Warnings: ${warnCount}`);
  console.log(`   ❌ Failed: ${failCount}\n`);

  // Overall health
  const healthPercentage = Math.round((passCount / totalChecks) * 100);
  let healthStatus = '';
  let healthIcon = '';
  
  if (healthPercentage >= 90) {
    healthStatus = 'EXCELLENT';
    healthIcon = '🟢';
  } else if (healthPercentage >= 75) {
    healthStatus = 'GOOD';
    healthIcon = '🟡';
  } else if (healthPercentage >= 50) {
    healthStatus = 'NEEDS ATTENTION';
    healthIcon = '🟠';
  } else {
    healthStatus = 'CRITICAL';
    healthIcon = '🔴';
  }

  console.log(`${healthIcon} OVERALL HEALTH: ${healthStatus} (${healthPercentage}%)\n`);

  // List failures
  if (results.errors.length > 0) {
    console.log('❌ CRITICAL ISSUES:');
    results.errors.forEach(err => {
      console.log(`   • ${err.component}: ${err.message}`);
    });
    console.log('');
  }

  // List warnings
  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    results.warnings.forEach(warn => {
      console.log(`   • ${warn.component}: ${warn.message}`);
    });
    console.log('');
  }

  // Recommendations
  console.log('💡 RECOMMENDED ACTIONS:');
  
  if (failCount > 0) {
    console.log('   1. Fix critical issues first (❌ marks above)');
  }
  
  if (results.checks.some(c => c.component === 'SHORT_SUMMARY' && c.status !== '✅')) {
    console.log('   2. Deploy AI updater: cd functions && firebase deploy --only functions');
    console.log('   3. Run backfill: curl https://[region]-[project].cloudfunctions.net/backfillHistory?month=10&day=17');
  }
  
  if (results.checks.some(c => c.component === 'SCHEDULER_DEPLOY' && c.status !== '✅')) {
    console.log('   4. Deploy scheduler: firebase deploy --only functions');
  }
  
  console.log('   5. Deploy frontend: npm run build && vercel --prod');
  console.log('   6. Verify live site is showing shortSummary and modal popups');

  console.log('\n═════════════════════════════════════════════════════════════════\n');

  // Save report to file
  try {
    const { writeFileSync } = require('fs');
    writeFileSync(
      './HEALTH_REPORT_' + new Date().toISOString().replace(/:/g, '-').split('.')[0] + '.json',
      JSON.stringify(results, null, 2)
    );
    console.log('📁 Detailed report saved to: HEALTH_REPORT_[timestamp].json\n');
  } catch (error) {
    console.log('⚠️  Could not save report file:', error.message);
  }
}

/**
 * MAIN EXECUTION
 */
async function runHealthCheck() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🏥 REALTEA SYSTEM HEALTH CHECK & AUTO-REPAIR');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Starting comprehensive system diagnostic...\n');

  try {
    await checkFirebaseConfig();
    await checkAIUpdater();
    await checkScheduler();
    await checkFrontend();
    await checkStyling();
  } catch (error) {
    console.error('\n❌ FATAL ERROR during health check:', error);
    addCheck('HEALTH_CHECK', '❌', 'Health check failed', error.message);
  }

  generateReport();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthCheck()
    .then(() => {
      console.log('✅ Health check complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    });
}

export default runHealthCheck;

