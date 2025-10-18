/**
 * Recalculate Rank Scores Job
 * Recalculates and updates rank scores for all events
 * Usage: node scripts/recalculateRanks.js
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

// Import ranking utilities
const {
  calculateRankScore,
  calculateFreshnessScore,
  calculateEngagementScore,
  calculateNeutralityBonus,
  calculateBreakingBoost,
  calculateFactCheckModifier,
  calculateCategoryDiversityPenalty,
} = require('../src/lib/rankUtils');

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
 * Main ranking job
 */
async function recalculateRanksJob() {
  log(colors.cyan, '\n════════════════════════════════════════════════════════════');
  log(colors.cyan, '📊 RANK SCORE RECALCULATION JOB');
  log(colors.cyan, '════════════════════════════════════════════════════════════\n');

  try {
    // Fetch all events
    log(colors.yellow, '📊 Fetching all events from Firestore...');
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();

    if (snapshot.empty) {
      log(colors.yellow, '\n⚠️  No events found in Firestore');
      process.exit(0);
    }

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    log(colors.green, `✅ Loaded ${events.length} events\n`);

    // Calculate rank scores
    log(colors.cyan, '🔢 Calculating rank scores...\n');

    const rankedEvents = events.map((event, index) => {
      const rankScore = calculateRankScore(event, {
        allEvents: events,
        applyDiversityPenalty: true
      });

      return {
        ...event,
        rankScore
      };
    });

    // Sort by rank
    rankedEvents.sort((a, b) => b.rankScore - a.rankScore);

    // Show top 10
    log(colors.cyan, '📈 Top 10 Events by Rank:\n');
    rankedEvents.slice(0, 10).forEach((event, i) => {
      const fresh = calculateFreshnessScore(event).toFixed(1);
      const engage = calculateEngagementScore(event).toFixed(1);
      const cred = event.credibilityScore || event.credibility || 70;
      
      log(
        colors.green,
        `   ${i + 1}. [${event.rankScore.toFixed(1)}] ${event.title?.substring(0, 60)}...`
      );
      log(
        colors.yellow,
        `      Cred: ${cred} | Fresh: ${fresh} | Engage: ${engage} | Category: ${event.category}`
      );
    });

    // Update Firestore
    log(colors.cyan, '\n💾 Updating Firestore with new ranks...\n');

    let updated = 0;
    let failed = 0;

    for (const event of rankedEvents) {
      try {
        await db.collection('events').doc(event.id).update({
          rankScore: event.rankScore,
          rankedAt: new Date()
        });
        
        updated++;
        
        if (updated % 20 === 0) {
          log(colors.gray, `   Processed ${updated}/${events.length}...`);
        }
      } catch (error) {
        log(colors.red, `   ❌ Failed to update ${event.id}: ${error.message}`);
        failed++;
      }
    }

    // Distribution analysis
    const scoreRanges = {
      '90-100': rankedEvents.filter(e => e.rankScore >= 90).length,
      '80-89': rankedEvents.filter(e => e.rankScore >= 80 && e.rankScore < 90).length,
      '70-79': rankedEvents.filter(e => e.rankScore >= 70 && e.rankScore < 80).length,
      '60-69': rankedEvents.filter(e => e.rankScore >= 60 && e.rankScore < 70).length,
      '0-59': rankedEvents.filter(e => e.rankScore < 60).length,
    };

    const categoryDist = {};
    rankedEvents.forEach(e => {
      const cat = e.category || 'Unknown';
      categoryDist[cat] = (categoryDist[cat] || 0) + 1;
    });

    // Summary
    log(colors.cyan, '\n════════════════════════════════════════════════════════════');
    log(colors.green, '✅ RANK RECALCULATION COMPLETE');
    log(colors.cyan, '════════════════════════════════════════════════════════════\n');
    log(colors.green, `   ✅ Updated: ${updated}`);
    log(colors.red, `   ❌ Failed: ${failed}`);
    log(colors.cyan, `\n📊 Score Distribution:`);
    Object.entries(scoreRanges).forEach(([range, count]) => {
      log(colors.yellow, `   ${range}: ${count} events`);
    });
    log(colors.cyan, `\n📂 Category Distribution:`);
    Object.entries(categoryDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cat, count]) => {
        log(colors.yellow, `   ${cat}: ${count} events`);
      });
    log(colors.cyan, '\n════════════════════════════════════════════════════════════\n');

  } catch (error) {
    log(colors.red, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run job
recalculateRanksJob();

