/**
 * Batch Event Analysis Job
 * Analyzes unanalyzed events in Firestore using AI
 * Usage: node scripts/analyzeEvents.js [--limit=50]
 */

const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!getApps().length) {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
  
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    initializeApp({
      credential: require('firebase-admin/app').cert(serviceAccount)
    });
    console.log('✅ Using service account credentials');
  } catch (error) {
    initializeApp(config);
    console.log('✅ Using environment config');
  }
}

const db = getFirestore();

// Color console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * Analyze events using OpenAI
 */
async function analyzeEventsJob() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

  log(colors.cyan, '\n════════════════════════════════════════════════════════════');
  log(colors.cyan, '🤖 EVENT ANALYSIS JOB');
  log(colors.cyan, '════════════════════════════════════════════════════════════\n');

  try {
    // Fetch unanalyzed events
    log(colors.yellow, `📊 Fetching up to ${limit} unanalyzed events...`);
    
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef
      .where('analyzedAt', '==', null)
      .limit(limit)
      .get();

    if (snapshot.empty) {
      log(colors.green, '\n✅ All events are already analyzed!');
      process.exit(0);
    }

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    log(colors.green, `✅ Found ${events.length} unanalyzed events\n`);

    // Import AI utilities
    const OpenAI = require('openai').default;
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      log(colors.red, '❌ OpenAI API key not found in environment');
      process.exit(1);
    }

    const openai = new OpenAI({ apiKey });

    let analyzed = 0;
    let failed = 0;
    let skipped = 0;

    // Process each event
    for (const event of events) {
      try {
        log(colors.cyan, `🔍 Analyzing: ${event.title?.substring(0, 60)}...`);

        const prompt = `Analyze this event and provide JSON with: summary (1 sentence, max 35 words), credibility (0-100), bias (neutral/left/right/state/conspiracy/unknown), factCheckStatus (verified/unverified/disputed/false).

Event: ${event.title}
Date: ${event.date}
Description: ${event.description?.substring(0, 200)}

Respond with JSON only.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 300,
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Update Firestore
        await db.collection('events').doc(event.id).update({
          aiSummary: result.summary || event.description?.substring(0, 150),
          credibilityScore: Math.min(100, Math.max(0, parseInt(result.credibility) || 70)),
          biasLabel: result.bias || 'unknown',
          factCheckStatus: result.factCheckStatus || 'unverified',
          analyzedAt: new Date(),
          analyzedBy: 'gpt-4o-mini'
        });

        log(colors.green, `   ✅ Score: ${result.credibility} | Bias: ${result.bias}`);
        analyzed++;

        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        log(colors.red, `   ❌ Error: ${error.message}`);
        failed++;
      }
    }

    // Summary
    log(colors.cyan, '\n════════════════════════════════════════════════════════════');
    log(colors.green, '✅ ANALYSIS COMPLETE');
    log(colors.cyan, '════════════════════════════════════════════════════════════\n');
    log(colors.green, `   ✅ Analyzed: ${analyzed}`);
    log(colors.red, `   ❌ Failed: ${failed}`);
    log(colors.yellow, `   ⏭️  Skipped: ${skipped}`);
    log(colors.cyan, '\n════════════════════════════════════════════════════════════\n');

  } catch (error) {
    log(colors.red, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run job
analyzeEventsJob();

