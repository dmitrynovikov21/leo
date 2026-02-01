import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { PuTransactionType } from '@prisma/client'
import { checkAndSendNotifications } from '@/lib/pu-notifications'

/**
 * Get user's current PU balance
 */
export async function getPuBalance(userId: string): Promise<number> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    select: { puBalance: true },
  })

  if (!sub) {
    throw new Error(`User subscription not found for userId: ${userId}`)
  }

  return parseFloat(sub.puBalance.toString())
}

/**
 * Check if user has sufficient balance for operation
 * Allows operations until -5.0 PU (soft limit)
 */
export async function checkPuAvailable(userId: string, requiredPu: number): Promise<boolean> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
    select: { puBalance: true, isBlocked: true },
  })

  if (!sub) return false
  if (sub.isBlocked) return false

  const balance = parseFloat(sub.puBalance.toString())
  // Allow up to -5.0 PU soft limit
  return balance - requiredPu >= -5.0
}

/**
 * Deduct PU from user balance (atomic operation)
 */
export async function deductPu(params: {
  userId: string
  puAmount: number
  source: string
  description: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { userId, puAmount, source, description, metadata } = params

  await prisma.$transaction(async (tx) => {
    // Get current subscription
    const sub = await tx.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    })

    if (!sub) {
      throw new Error(`User subscription not found for userId: ${userId}`)
    }

    const balanceBefore = parseFloat(sub.puBalance.toString())
    const balanceAfter = balanceBefore - puAmount

    // Prevent hard block at -5.0
    if (balanceAfter < -5.0) {
      throw new Error(
        `Cannot complete operation. Would exceed overdraft limit. Current: ${balanceBefore}, Required: ${puAmount}`
      )
    }

    // Update balance and overdraft status
    await tx.userSubscription.update({
      where: { userId },
      data: {
        puBalance: new Decimal(balanceAfter),
        puUsedThisCycle: { increment: new Decimal(puAmount) },
        isOverdraft: balanceAfter < 0,
        isBlocked: balanceAfter < -5.0,
      },
    })

    // Record transaction
    await tx.puTransaction.create({
      data: {
        userId,
        type: 'OVERAGE_DEDUCTION' as PuTransactionType,
        puAmount: new Decimal(-puAmount),
        balanceBefore: new Decimal(balanceBefore),
        balanceAfter: new Decimal(balanceAfter),
        source,
        description,
        metadata,
        billingCycleDate: sub.billingCycleStartDate,
      },
    })

    // Check and send notifications
    const usagePercent = (parseFloat(sub.puUsedThisCycle.toString()) + puAmount) / parseFloat(sub.puLimit.toString()) * 100
    await checkAndSendNotifications(tx, userId, usagePercent, balanceAfter, sub.billingCycleStartDate)
  })
}

/**
 * Add PU to user balance (admin adjustment or pack purchase)
 */
export async function addPuBalance(params: {
  userId: string
  puAmount: number
  type: 'PACK_TOPUP' | 'ADMIN_ADJUSTMENT'
  description: string
  metadata?: Record<string, any>
  createdBy?: string
}): Promise<void> {
  const { userId, puAmount, type, description, metadata, createdBy } = params

  await prisma.$transaction(async (tx) => {
    const sub = await tx.userSubscription.findUnique({
      where: { userId },
    })

    if (!sub) {
      throw new Error(`User subscription not found for userId: ${userId}`)
    }

    const balanceBefore = parseFloat(sub.puBalance.toString())
    const balanceAfter = balanceBefore + puAmount

    // Update balance
    await tx.userSubscription.update({
      where: { userId },
      data: {
        puBalance: new Decimal(balanceAfter),
        isOverdraft: balanceAfter < 0,
        isBlocked: balanceAfter < -5.0,
      },
    })

    // Record transaction
    await tx.puTransaction.create({
      data: {
        userId,
        type: type === 'PACK_TOPUP' ? 'PACK_TOPUP' : 'ADMIN_ADJUSTMENT',
        puAmount: new Decimal(puAmount),
        balanceBefore: new Decimal(balanceBefore),
        balanceAfter: new Decimal(balanceAfter),
        description,
        metadata,
        createdBy,
      },
    })
  })
}

/**
 * Get transaction history for user
 */
export async function getPuTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const transactions = await prisma.puTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.puTransaction.count({
    where: { userId },
  })

  return {
    transactions: transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      puAmount: parseFloat(tx.puAmount.toString()),
      balanceBefore: parseFloat(tx.balanceBefore.toString()),
      balanceAfter: parseFloat(tx.balanceAfter.toString()),
      source: tx.source,
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
      createdBy: tx.createdBy,
    })),
    total,
  }
}
