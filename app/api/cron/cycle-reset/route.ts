import { NextResponse } from 'next/server'
import { dailyCycleResetJob } from '@/lib/subscription-manager'

/**
 * Daily subscription cycle reset cron job
 * Resets PU balance for subscriptions on their reset date
 * Should be called daily at 00:00 UTC
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret if set
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting cycle reset job...')

    await dailyCycleResetJob()

    console.log('[Cron] Cycle reset job completed')

    return NextResponse.json({
      success: true,
      message: 'Cycle reset job completed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error in cycle reset job:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
