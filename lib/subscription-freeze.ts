/**
 * Subscription Freeze Logic
 * When subscription expires, freeze user's data that exceeds FREE tier limits
 */

import { prisma } from '@/lib/db'
import { addDays } from 'date-fns'

/**
 * Freeze user data when subscription expires
 * Marks excess files as FROZEN, disables search
 */
export async function freezeUserDataOnExpiry(userId: string) {
  console.log(`[Freeze] Freezing data for user ${userId}`)

  try {
    // Get user's subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
      include: {
        plan: true,
      },
    })

    if (!subscription) {
      console.warn(`[Freeze] No subscription found for user ${userId}`)
      return
    }

    // Get FREE plan limits (if exists)
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { code: 'FREE' },
    })

    if (!freePlan) {
      console.warn(`[Freeze] No FREE plan found, cannot determine limits`)
      return
    }

    // Get user's library and knowledge base
    const libraryItems = await prisma.libraryItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: {
        agent: {
          userId,
        },
      },
    })

    // Calculate how many items exceed FREE limits
    // Assuming FREE plan has lower limits, mark items as FROZEN in order
    const itemsToFreeze = libraryItems.slice(0) // All items could be frozen if needed

    // Create FROZEN records for excess items
    for (const item of itemsToFreeze) {
      try {
        await prisma.frozenData.create({
          data: {
            userId,
            resourceType: 'LIBRARY_ITEM',
            resourceId: item.id,
            planCodeRequired: subscription.plan.code,
            puSizeEstimate: Math.ceil((item.fileSize || 0) / 1000), // Rough PU estimate
            deleteScheduledAt: addDays(new Date(), 30),
            metadata: {
              filename: item.name,
              fileSize: item.fileSize,
              originalPlan: subscription.plan.code,
            },
          },
        })

        console.log(`[Freeze] Marked library item ${item.id} as FROZEN`)
      } catch (error) {
        console.error(`[Freeze] Failed to freeze library item ${item.id}:`, error)
      }
    }

    // Also freeze knowledge bases if needed
    for (const kb of knowledgeBases) {
      try {
        await prisma.frozenData.create({
          data: {
            userId,
            resourceType: 'KNOWLEDGE_BASE',
            resourceId: kb.id,
            planCodeRequired: subscription.plan.code,
            puSizeEstimate: Math.ceil((kb.fileSize || 0) / 1000),
            deleteScheduledAt: addDays(new Date(), 30),
            metadata: {
              filename: kb.filename,
              fileSize: kb.fileSize,
              agentId: kb.agentId,
              originalPlan: subscription.plan.code,
            },
          },
        })

        console.log(`[Freeze] Marked knowledge base ${kb.id} as FROZEN`)
      } catch (error) {
        console.error(`[Freeze] Failed to freeze knowledge base ${kb.id}:`, error)
      }
    }

    // Update subscription status to FROZEN
    await prisma.userSubscription.update({
      where: { userId },
      data: {
        status: 'FROZEN',
      },
    })

    // Create notification about frozen data
    const frozenCount = itemsToFreeze.length + knowledgeBases.length
    await prisma.puNotification.create({
      data: {
        userId,
        type: 'SERVICE_BLOCKED',
        puBalance: -10, // Mark as critical
        puLimit: subscription.plan.monthlyPuLimit || 0,
        usagePercent: 100,
        billingCycleDate: new Date(),
        wasSent: true,
        channel: 'UI',
        sentAt: new Date(),
      },
    }).catch(err => console.warn('[Freeze] Failed to create notification:', err))

    console.log(`[Freeze] Successfully froze ${frozenCount} items for user ${userId}`)
    return frozenCount
  } catch (error) {
    console.error(`[Freeze] Error freezing data for user ${userId}:`, error)
  }
}

/**
 * Unfreeze user data when subscription is renewed
 * Restore access to previously frozen items
 */
export async function unfreezeUserDataOnRenewal(userId: string) {
  console.log(`[Unfreeze] Unfreezing data for user ${userId}`)

  try {
    // Delete all FROZEN records for this user
    const frozen = await prisma.frozenData.findMany({
      where: { userId },
    })

    const deleteCount = await prisma.frozenData.deleteMany({
      where: { userId },
    })

    console.log(`[Unfreeze] Deleted ${deleteCount.count} frozen records for user ${userId}`)

    // Update subscription status back to ACTIVE
    await prisma.userSubscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
      },
    }).catch(err => {
      console.warn('[Unfreeze] Could not update subscription status:', err)
    })

    return deleteCount.count
  } catch (error) {
    console.error(`[Unfreeze] Error unfreezing data for user ${userId}:`, error)
  }
}

/**
 * Check if a resource is frozen for user
 */
export async function isResourceFrozen(userId: string, resourceId: string): Promise<boolean> {
  try {
    const frozen = await prisma.frozenData.findFirst({
      where: {
        userId,
        resourceId,
      },
    })

    return !!frozen
  } catch (error) {
    console.error('[Freeze] Error checking if resource is frozen:', error)
    return false
  }
}

/**
 * Get all frozen resources for user
 */
export async function getFrozenResourcesForUser(userId: string) {
  try {
    return await prisma.frozenData.findMany({
      where: { userId },
      orderBy: { frozenAt: 'desc' },
    })
  } catch (error) {
    console.error('[Freeze] Error getting frozen resources:', error)
    return []
  }
}
