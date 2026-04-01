/**
 * Cron Jobs for PU Billing System
 * These run on backend startup and periodically
 */

import { prisma } from '@/lib/db'
import { addMonths } from 'date-fns'
import { createUiNotification } from './pu-notifications-ui'
import { readdir, stat, unlink } from 'fs/promises'
import path from 'path'

let isRunning = false

/**
 * Reset subscription cycle for users whose cycle date has passed
 * Burns unused PU and grants new monthly allowance
 */
export async function runCycleReset() {
  console.log('[Cron] Starting cycle reset...')

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const subscriptionsToReset = await prisma.userSubscription.findMany({
      where: {
        nextResetDate: {
          lte: today,
        },
        status: 'ACTIVE',
      },
      include: {
        user: true,
        plan: true,
      },
    })

    console.log(`[Cron] Found ${subscriptionsToReset.length} subscriptions to reset`)

    for (const sub of subscriptionsToReset) {
      try {
        await prisma.$transaction(async (tx) => {
          // Record the burn of unused balance
          if (sub.puBalance > 0) {
            await tx.puTransaction.create({
              data: {
                userId: sub.userId,
                type: 'RESET',
                puAmount: -sub.puBalance,
                balanceBefore: sub.puBalance,
                balanceAfter: 0,
                source: 'CYCLE_RESET',
                description: `${sub.puBalance.toFixed(2)} PU неиспользованных - сгорели`,
                billingCycleDate: sub.billingCycleStartDate,
              },
            })
          }

          // Record the new grant
          await tx.puTransaction.create({
            data: {
              userId: sub.userId,
              type: 'SUBSCRIPTION_GRANT',
              puAmount: sub.puLimit,
              balanceBefore: 0,
              balanceAfter: sub.puLimit,
              source: 'CYCLE_RESET',
              description: `Новый месячный лимит ${sub.puLimit} PU`,
              billingCycleDate: sub.billingCycleStartDate,
            },
          })

          // Update subscription
          const newCycleStart = new Date()
          const newCycleEnd = addMonths(newCycleStart, 1)

          await tx.userSubscription.update({
            where: { userId: sub.userId },
            data: {
              puBalance: sub.puLimit,
              puUsedThisCycle: 0,
              overagePuUsed: 0,
              billingCycleStartDate: newCycleStart,
              nextResetDate: newCycleEnd,
              isOverdraft: false,
              isBlocked: false,
            },
          })
        })

        console.log(`[Cron] Reset cycle for user ${sub.userId}`)
      } catch (error) {
        console.error(`[Cron] Failed to reset cycle for user ${sub.userId}:`, error)
      }
    }

    console.log('[Cron] Cycle reset completed')
  } catch (error) {
    console.error('[Cron] Cycle reset failed:', error)
  }
}

/**
 * Transition CANCELED subscriptions to FREE when billing cycle ends
 */
export async function runCanceledToFree() {
  console.log('[Cron] Checking canceled subscriptions for FREE transition...')

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: { code: 'FREE' },
    })

    if (!freePlan) {
      console.warn('[Cron] FREE plan not found, skipping canceled->free transition')
      return
    }

    const canceledSubs = await prisma.userSubscription.findMany({
      where: {
        status: 'CANCELED',
        nextResetDate: { lte: today },
      },
      include: { plan: true },
    })

    console.log(`[Cron] Found ${canceledSubs.length} canceled subscriptions to transition to FREE`)

    for (const sub of canceledSubs) {
      try {
        const now = new Date()
        const nextReset = addMonths(now, 1)

        await prisma.$transaction(async (tx) => {
          // Burn remaining balance
          if (Number(sub.puBalance) > 0) {
            await tx.puTransaction.create({
              data: {
                userId: sub.userId,
                type: 'RESET',
                puAmount: -sub.puBalance,
                balanceBefore: sub.puBalance,
                balanceAfter: 0,
                source: 'CANCEL_TO_FREE',
                description: `Переход на бесплатный план. Сожжено ${sub.puBalance} PU`,
              },
            })
          }

          // Grant FREE plan balance
          await tx.puTransaction.create({
            data: {
              userId: sub.userId,
              type: 'SUBSCRIPTION_GRANT',
              puAmount: freePlan.monthlyPuLimit,
              balanceBefore: 0,
              balanceAfter: freePlan.monthlyPuLimit,
              source: 'CANCEL_TO_FREE',
              description: `Бесплатный план: ${freePlan.monthlyPuLimit} PU`,
            },
          })

          // Switch to FREE plan
          await tx.userSubscription.update({
            where: { userId: sub.userId },
            data: {
              planId: freePlan.id,
              status: 'ACTIVE',
              puBalance: freePlan.monthlyPuLimit,
              puLimit: freePlan.monthlyPuLimit,
              puUsedThisCycle: 0,
              overagePuUsed: 0,
              isOverdraft: false,
              isBlocked: false,
              tochkaOperationId: null,
              billingCycleStartDate: now,
              nextResetDate: nextReset,
            },
          })
        })

        console.log(`[Cron] Transitioned user ${sub.userId} from ${sub.plan.code} to FREE`)
      } catch (error) {
        console.error(`[Cron] Failed to transition user ${sub.userId} to FREE:`, error)
      }
    }
  } catch (error) {
    console.error('[Cron] Canceled->FREE transition failed:', error)
  }
}

/**
 * Clean up frozen data that's older than 30 days
 * Permanently delete vectors and files
 */
export async function runCleanupFrozen() {
  console.log('[Cron] Starting frozen data cleanup...')

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const frozenToDelete = await prisma.frozenData.findMany({
      where: {
        frozenAt: {
          lte: thirtyDaysAgo,
        },
      },
    })

    console.log(`[Cron] Found ${frozenToDelete.length} frozen items to delete`)

    for (const frozen of frozenToDelete) {
      try {
        // Delete frozen data record
        await prisma.frozenData.delete({
          where: { id: frozen.id },
        })

        // TODO: Delete actual knowledge base or library items if needed
        // This depends on your data structure

        console.log(`[Cron] Deleted frozen data: ${frozen.id}`)
      } catch (error) {
        console.error(`[Cron] Failed to delete frozen data ${frozen.id}:`, error)
      }
    }

    console.log('[Cron] Cleanup frozen completed')
  } catch (error) {
    console.error('[Cron] Cleanup frozen failed:', error)
  }
}

/**
 * Send pending UI notifications
 * Mark them as sent after creation
 */
export async function runSendNotifications() {
  console.log('[Cron] Starting notifications check...')

  try {
    // Get all active subscriptions and check their balance
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        user: true,
        plan: true,
      },
    })

    console.log(`[Cron] Checking ${subscriptions.length} subscriptions for notifications`)

    for (const sub of subscriptions) {
      try {
        const usagePercent = (sub.puUsedThisCycle / sub.puLimit) * 100

        // Check thresholds and create notifications
        if (usagePercent >= 80 && usagePercent < 100) {
          await createUiNotification(sub.userId, 'WARNING_80_PERCENT', {
            usagePercent,
            puBalance: sub.puBalance,
            puLimit: sub.puLimit,
          })
        } else if (usagePercent >= 100 && sub.puBalance >= 0) {
          await createUiNotification(sub.userId, 'LIMIT_REACHED', {
            usagePercent: 100,
            puBalance: sub.puBalance,
            puLimit: sub.puLimit,
          })
        } else if (sub.puBalance < 0 && sub.puBalance >= -5.0) {
          await createUiNotification(sub.userId, 'OVERDRAFT_WARNING', {
            usagePercent,
            puBalance: sub.puBalance,
            puLimit: sub.puLimit,
          })
        } else if (sub.puBalance < -5.0 && !sub.isBlocked) {
          await createUiNotification(sub.userId, 'SERVICE_BLOCKED', {
            usagePercent,
            puBalance: sub.puBalance,
            puLimit: sub.puLimit,
          })
        }
      } catch (error) {
        console.error(`[Cron] Failed to check notifications for user ${sub.userId}:`, error)
      }
    }

    console.log('[Cron] Notifications check completed')
  } catch (error) {
    console.error('[Cron] Send notifications failed:', error)
  }
}

/**
 * Clean up support attachments older than 7 days
 */
export async function runCleanupSupportFiles() {
  console.log('[Cron] Starting support files cleanup...')

  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'support')
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    let files: string[]
    try {
      files = await readdir(uploadDir)
    } catch {
      // Directory doesn't exist yet — nothing to clean
      return
    }

    let deleted = 0
    for (const file of files) {
      try {
        const filePath = path.join(uploadDir, file)
        const fileStat = await stat(filePath)
        if (fileStat.mtimeMs < sevenDaysAgo) {
          await unlink(filePath)
          deleted++
        }
      } catch (e) {
        // Skip individual file errors
      }
    }

    if (deleted > 0) {
      console.log(`[Cron] Deleted ${deleted} support attachments older than 7 days`)
    }
  } catch (error) {
    console.error('[Cron] Support files cleanup failed:', error)
  }
}

/**
 * Run all cron jobs
 * Called on app startup and periodically
 */
export async function runAllCronJobs() {
  if (isRunning) {
    console.log('[Cron] Jobs already running, skipping...')
    return
  }

  isRunning = true

  try {
    console.log('[Cron] Running all cron jobs...')

    // Run cycle reset first (most important)
    await runCycleReset()

    // Transition canceled subscriptions to FREE
    await runCanceledToFree()

    // Clean up frozen data
    await runCleanupFrozen()

    // Check and create notifications
    await runSendNotifications()

    // Clean up old support attachments
    await runCleanupSupportFiles()

    console.log('[Cron] All cron jobs completed successfully')
  } catch (error) {
    console.error('[Cron] Error running jobs:', error)
  } finally {
    isRunning = false
  }
}

/**
 * Initialize cron jobs on app startup
 * Run immediately, then periodically
 */
export function initializeCronJobs() {
  console.log('[Cron] Initializing cron jobs on startup...')

  // Run immediately
  runAllCronJobs().catch((error) => {
    console.error('[Cron] Failed to run jobs on startup:', error)
  })

  // Run daily (every 24 hours)
  const dailyInterval = setInterval(() => {
    console.log('[Cron] Running scheduled daily cron jobs...')
    runAllCronJobs().catch((error) => {
      console.error('[Cron] Failed to run scheduled jobs:', error)
    })
  }, 24 * 60 * 60 * 1000) // 24 hours

  // Return cleanup function
  return () => {
    clearInterval(dailyInterval)
  }
}
