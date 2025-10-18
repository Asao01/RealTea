/**
 * News Scheduler
 * Automatically fetches news every 6 hours
 */

// Only run scheduler on server side
const isServer = typeof window === 'undefined';

let schedulerInterval = null;

const log = {
  info: (msg) => console.log(`🌙 [SCHEDULER] ${msg}`),
  success: (msg) => console.log(`✅ [SCHEDULER] ${msg}`),
  error: (msg) => console.error(`❌ [SCHEDULER] ${msg}`)
};

/**
 * Run news fetch via API call
 */
async function runNewsFetch() {
  if (!isServer) return;
  
  try {
    log.info('Triggering news fetch...');
    
    // Call the API route
    const response = await fetch('http://localhost:3000/api/fetchNews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    
    if (data.success) {
      log.success(`News fetch completed: ${data.results?.saved || 0} new events saved`);
    } else {
      log.error(`News fetch failed: ${data.error}`);
    }
  } catch (error) {
    log.error(`Failed to trigger news fetch: ${error.message}`);
  }
}

/**
 * Schedule news updates
 * Runs immediately and then every 6 hours
 */
export function scheduleNewsUpdates() {
  if (!isServer) {
    console.log('🌙 [SCHEDULER] Skipping scheduler (client-side)');
    return;
  }

  log.info('═══════════════════════════════════════════════');
  log.info('🌙 NEWS SCHEDULER INITIALIZED');
  log.info('═══════════════════════════════════════════════');
  log.info('📅 Schedule: Every 6 hours');
  log.info('🚀 First run: In 30 seconds');
  log.info('⏰ Next runs: Every 6 hours after that');
  log.info('═══════════════════════════════════════════════');

  // Run first fetch after 30 seconds (give server time to fully start)
  setTimeout(() => {
    log.info('🚀 Running initial news fetch...');
    runNewsFetch();
  }, 30000);

  // Schedule to run every 6 hours (6 * 60 * 60 * 1000 ms)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  
  schedulerInterval = setInterval(() => {
    const now = new Date().toLocaleString();
    log.info(`⏰ Scheduled run at ${now}`);
    runNewsFetch();
  }, SIX_HOURS);

  // Cleanup function
  process.on('SIGINT', () => {
    if (schedulerInterval) {
      log.info('Stopping news scheduler...');
      clearInterval(schedulerInterval);
    }
  });

  log.success('Scheduler active and running!');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log.info('Scheduler stopped');
  }
}

