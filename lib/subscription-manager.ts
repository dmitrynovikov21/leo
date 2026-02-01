import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { addDays, addMonths } from 'date-fns'

/**
 * Reset subscription cycle - reset PU balance to plan limit
 * Called from Stripe webhook or daily cron job
 */
export async function resetSubscriptionCycle(userId: string) {
  await prisma.$transaction(async (tx) => {
    const sub = await tx.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    })

    if (!sub) {
      throw new Error(`User subscription not found for userId: ${userId}`)
    }

    // 1. Record reset transaction (burn unused balance)
    if (sub.puBalance > 0) {
      await tx.puTransaction.create({
        data: {
          userId,
          type: 'RESET',
          puAmount: new Decimal(-parseFloat(sub.puBalance.toString())),
          balanceBefore: sub.puBalance,
          balanceAfter: new Decimal(0),
          source: 'CYCLE_RESET',
          description: `Monthly cycle reset - burned unused ${sub.puBalance} PU`,
          billingCycleDate: sub.billingCycleStartDate,
        },
      })
    }

    // 2. Grant new monthly allowance
    await tx.puTransaction.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_GRANT',
        puAmount: sub.plan.monthlyPuLimit,
        balanceBefore: new Decimal(0),
        balanceAfter: sub.plan.monthlyPuLimit,
        source: 'SUBSCRIPTION_GRANT',
        description: `Monthly ${sub.plan.code} plan grant: ${sub.plan.monthlyPuLimit} PU`,
      },
    })

    // 3. Update subscription cycle dates
    const newCycleStart = new Date()
    const newCycleEnd = addMonths(newCycleStart, 1)

    await tx.userSubscription.update({
      where: { userId },
      data: {
        puBalance: sub.plan.monthlyPuLimit,
        puUsedThisCycle: new Decimal(0),
        overagePuUsed: new Decimal(0),
        billingCycleStartDate: newCycleStart,
        nextResetDate: newCycleEnd,
        isOverdraft: false,
        isBlocked: false,
      },
    })
  })
}

/**
 * Daily cron job - reset subscriptions that need resetting
 */
export async function dailyCycleResetJob() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const usersToReset = await prisma.userSubscription.findMany({
    where: {
      nextResetDate: { lte: today },
      status: 'ACTIVE',
    },
    select: { userId: true },
  })

  console.log(`[Cron] Found ${usersToReset.length} subscriptions to reset`)

  for (const sub of usersToReset) {
    try {
      await resetSubscriptionCycle(sub.userId)
      console.log(`[Cron] Reset cycle for user ${sub.userId}`)
    } catch (error) {
      console.error(`[Cron] Error resetting cycle for user ${sub.userId}:`, error)
    }
  }
}

/**
 * Freeze user data when subscription expires
 */
export async function freezeUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agents: {
        include: {
          knowledgeBases: true,
        },
      },
      libraryItems: true,
      subscription: true,
    },
  })

  if (!user || !user.subscription) {
    throw new Error(`User or subscription not found for userId: ${userId}`)
  }

  await prisma.$transaction(async (tx) => {
    // Freeze knowledge bases from all agents
    for (const agent of user.agents) {
      for (const kb of agent.knowledgeBases) {
        await tx.frozenData.create({
          data: {
            userId,
            resourceType: 'KNOWLEDGE_BASE',
            resourceId: kb.id,
            planCodeRequired: 'BASIC',
            puSizeEstimate: estimatePuSize(kb.fileSize),
            frozenAt: new Date(),
            deleteScheduledAt: addDays(new Date(), 30),
            metadata: {
              filename: kb.filename,
              agentName: agent.name,
            },
          },
        })
      }
    }

    // Freeze library items
    for (const item of user.libraryItems) {
      await tx.frozenData.create({
        data: {
          userId,
          resourceType: 'LIBRARY_ITEM',
          resourceId: item.id,
          planCodeRequired: 'BASIC',
          puSizeEstimate: estimatePuSize(item.fileSize || 0),
          frozenAt: new Date(),
          deleteScheduledAt: addDays(new Date(), 30),
          metadata: {
            filename: item.name,
          },
        },
      })
    }

    // Update subscription status to FROZEN
    await tx.userSubscription.update({
      where: { userId },
      data: {
        status: 'FROZEN',
      },
    })
  })

  console.log(`[Freeze] Froze data for user ${userId}`)
}

/**
 * Clean up expired frozen data - run daily
 */
export async function dailyCleanupFrozenDataJob() {
  const now = new Date()

  const toDelete = await prisma.frozenData.findMany({
    where: {
      deleteScheduledAt: { lte: now },
    },
  })

  console.log(`[Cleanup] Found ${toDelete.length} frozen data items to delete`)

  for (const frozen of toDelete) {
    try {
      // Delete from database
      await prisma.frozenData.delete({
        where: { id: frozen.id },
      })

      // TODO: If resourceType is KNOWLEDGE_BASE, also delete from Chroma and DocumentChunks
      // TODO: If resourceType is LIBRARY_ITEM, also delete from LibraryChunks

      console.log(`[Cleanup] Deleted frozen data ${frozen.id}`)
    } catch (error) {
      console.error(`[Cleanup] Error deleting frozen data ${frozen.id}:`, error)
    }
  }
}

/**
 * Unfreeze user data (when they upgrade plan or pay overdue)
 */
export async function unfreezeUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  })

  if (!user || !user.subscription) {
    throw new Error(`User or subscription not found for userId: ${userId}`)
  }

  await prisma.$transaction(async (tx) => {
    // Delete all frozen data records
    await tx.frozenData.deleteMany({
      where: { userId },
    })

    // Update subscription status back to ACTIVE
    await tx.userSubscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
      },
    })
  })

  console.log(`[Unfreeze] Unfroze data for user ${userId}`)
}

/**
 * Handle subscription payment failure (past due)
 */
export async function handleSubscriptionFailure(userId: string) {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  if (!sub) {
    throw new Error(`User subscription not found for userId: ${userId}`)
  }

  // Update status to PAST_DUE
  await prisma.userSubscription.update({
    where: { userId },
    data: {
      status: 'PAST_DUE',
    },
  })

  console.log(`[Payment] Subscription marked as PAST_DUE for user ${userId}`)
}

/**
 * Handle subscription cancellation
 */
export async function handleSubscriptionCancellation(userId: string) {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  if (!sub) {
    throw new Error(`User subscription not found for userId: ${userId}`)
  }

  // Update status to CANCELED
  await prisma.userSubscription.update({
    where: { userId },
    data: {
      status: 'CANCELED',
    },
  })

  // Freeze data if not already frozen
  const frozenCount = await prisma.frozenData.count({
    where: { userId },
  })

  if (frozenCount === 0) {
    await freezeUserData(userId)
  }

  console.log(`[Subscription] Subscription canceled for user ${userId}`)
}

/**
 * Estimate PU size based on file size
 * Rough estimate: 1 PU = ~1000 tokens = ~750 words = ~4000 bytes
 */
function estimatePuSize(fileSize: number): Decimal {
  // Very rough estimate: every 4KB ≈ 1 PU
  const estimatedPu = fileSize / 4000
  return new Decimal(Math.max(0.1, estimatedPu)) // Minimum 0.1 PU
}

/**
 * Get subscription details for user
 */
export async function getUserSubscription(userId: string) {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })

  if (!sub) return null

  return {
    id: sub.id,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    puBalance: parseFloat(sub.puBalance.toString()),
    puLimit: parseFloat(sub.puLimit.toString()),
    billingCycleStartDate: sub.billingCycleStartDate,
    nextResetDate: sub.nextResetDate,
    puUsedThisCycle: parseFloat(sub.puUsedThisCycle.toString()),
    isOverdraft: sub.isOverdraft,
    isBlocked: sub.isBlocked,
    status: sub.status,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  }
}
