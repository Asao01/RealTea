/**
 * Next.js Instrumentation
 * Runs on server start to initialize background tasks
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🌙 [SCHEDULER] Initializing news scheduler...');
    
    // Dynamically import to avoid issues with Firebase client-side
    const { scheduleNewsUpdates } = await import('./src/lib/newsScheduler');
    
    // Start the scheduler
    scheduleNewsUpdates();
  }
}

