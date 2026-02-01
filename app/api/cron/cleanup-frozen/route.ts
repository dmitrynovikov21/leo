import { NextResponse } from 'next/server'
import { dailyCleanupFrozenDataJob } from '@/lib/subscription-manager'

/**
 * Daily frozen data cleanup cron job
 * Deletes frozen data that has been frozen for 30+ days
 * Should be called daily at 02:00 UTC
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret if set
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting frozen data cleanup job...')

    await dailyCleanupFrozenDataJob()

    console.log('[Cron] Frozen data cleanup job completed')

    return NextResponse.json({
      success: true,
      message: 'Frozen data cleanup job completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error in cleanup job:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
