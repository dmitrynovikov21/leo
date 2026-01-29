/**
 * Initialize cron jobs on application startup
 * This file should be imported in the main layout or server component
 */

let isInitialized = false

/**
 * Initialize all cron jobs
 * Safe to call multiple times
 */
export async function initializeCronJobs() {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('[Cron] Already initialized, skipping...')
    return
  }

  try {
    isInitialized = true

    console.log('[Cron] Initializing cron jobs...')

    // Import and run cron jobs
    const { runAllCronJobs } = await import('./cron-jobs')

    // Run immediately
    console.log('[Cron] Running initial jobs...')
    await runAllCronJobs()

    // Schedule periodic runs (every 24 hours)
    const interval = setInterval(async () => {
      console.log('[Cron] Running scheduled jobs...')
      try {
        await runAllCronJobs()
      } catch (error) {
        console.error('[Cron] Error running scheduled jobs:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours

    // Store interval for cleanup if needed
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__cronInterval = interval
    }

    console.log('[Cron] Cron jobs initialized successfully')
  } catch (error) {
    console.error('[Cron] Failed to initialize cron jobs:', error)
    isInitialized = false
  }
}

/**
 * Cleanup cron jobs (for graceful shutdown)
 */
export function cleanupCronJobs() {
  if (typeof globalThis !== 'undefined' && (globalThis as any).__cronInterval) {
    clearInterval((globalThis as any).__cronInterval)
    console.log('[Cron] Cron jobs cleaned up')
  }
}

/**
 * Check if cron jobs are initialized
 */
export function areCronJobsInitialized() {
  return isInitialized
}
