import { NextResponse } from 'next/server'
import { getPendingNotifications, markNotificationAsSent, getNotificationTemplate } from '@/lib/pu-notifications'
import { sendEmail } from '@/lib/email'

/**
 * Send pending PU notifications
 * Should be called every 5-10 minutes
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret if set
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting notification sender job...')

    const notifications = await getPendingNotifications(100)
    console.log(`[Cron] Found ${notifications.length} pending notifications`)

    let sent = 0
    let failed = 0

    for (const notif of notifications) {
      try {
        const template = getNotificationTemplate(notif.type, {
          usagePercent: notif.usagePercent,
          puBalance: parseFloat(notif.puBalance.toString()),
          puLimit: parseFloat(notif.puLimit.toString()),
        })

        if (!notif.user.email) {
          console.warn(`[Cron] User ${notif.userId} has no email, skipping notification`)
          failed++
          continue
        }

        // Send email
        await sendEmail({
          to: notif.user.email,
          subject: template.subject,
          html: template.text.replace(/\n/g, '<br>'),
        })

        // Mark as sent
        await markNotificationAsSent(notif.id)
        sent++

        console.log(`[Cron] Sent notification ${notif.id} to ${notif.user.email}`)
      } catch (error) {
        console.error(`[Cron] Error sending notification ${notif.id}:`, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notification sender job completed',
      sent,
      failed,
      total: notifications.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error in notification sender job:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
