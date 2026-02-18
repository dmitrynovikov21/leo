import { prisma } from '@/lib/db'
import { getUserBalance, checkUserBalance as checkTokenBalance, deductTokens, addTokens } from '@/lib/balance'
import { checkPuAvailable, deductPu, getPuBalance } from '@/lib/pu-balance'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Unified billing interface - adapts between token and PU systems
 */
export interface BillingSystem {
  checkBalance(userId: string, requiredAmount: number): Promise<boolean>
  deductUsage(userId: string, amount: number, metadata: any): Promise<void>
  getBalance(userId: string): Promise<number>
  addBalance(userId: string, amount: number, source: string, metadata?: any): Promise<void>
}

/**
 * Legacy token-based billing system
 */
class TokenBillingSystem implements BillingSystem {
  async checkBalance(userId: string, requiredTokens: number): Promise<boolean> {
    return checkTokenBalance(userId, requiredTokens)
  }

  async deductUsage(userId: string, amount: number, metadata: any): Promise<void> {
    await deductTokens({
      userId,
      amount,
      description: metadata?.description || 'LLM Usage',
      metadata,
    })
  }

  async getBalance(userId: string): Promise<number> {
    return getUserBalance(userId)
  }

  async addBalance(userId: string, amount: number, source: string, metadata?: any): Promise<void> {
    await addTokens({
      userId,
      amount,
      type: 'TOPUP',
      description: `Balance top-up: ${source}`,
      metadata: { source, ...metadata },
    })
  }
}

/**
 * New PU-based subscription billing system
 */
class PuBillingSystem implements BillingSystem {
  async checkBalance(userId: string, requiredPu: number): Promise<boolean> {
    return checkPuAvailable(userId, requiredPu)
  }

  async deductUsage(userId: string, amount: number, metadata: any): Promise<void> {
    await deductPu({
      userId,
      puAmount: amount,
      source: metadata?.source || 'LLM_USAGE',
      description: metadata?.description || 'Usage',
      metadata,
    })
  }

  async getBalance(userId: string): Promise<number> {
    return getPuBalance(userId)
  }

  async addBalance(userId: string, amount: number, source: string, metadata?: any): Promise<void> {
    const sub = await prisma.userSubscription.findUnique({ where: { userId } })
    if (!sub) throw new Error('User subscription not found')

    const balanceBefore = parseFloat(sub.puBalance.toString())
    const balanceAfter = balanceBefore + amount

    await prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { userId },
        data: {
          puBalance: new Decimal(balanceAfter),
          isBlocked: balanceAfter < -5.0,
          isOverdraft: balanceAfter < 0,
        },
      })

      await tx.puTransaction.create({
        data: {
          userId,
          type: 'PACK_TOPUP',
          puAmount: new Decimal(amount),
          balanceBefore: sub.puBalance,
          balanceAfter: new Decimal(balanceAfter),
          source,
          description: `PU pack purchased: ${source}`,
          metadata: metadata ? { source, ...metadata } : { source },
        },
      })
    })
  }
}

/**
 * Factory function: returns appropriate billing system for user
 */
export async function getBillingSystem(userId: string): Promise<BillingSystem> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  if (sub) {
    return new PuBillingSystem()
  }

  // If no subscription, create a default FREE/BASIC one to migrate user to PU system
  try {
    // Find BASIC plan
    let plan = await prisma.subscriptionPlan.findUnique({
      where: { code: 'BASIC' }
    })

    // If no BASIC plan, strictly speaking we should fail or wait for admin seed.
    // But to be robust, let's assume one exists or pick the first one.
    if (!plan) {
      plan = await prisma.subscriptionPlan.findFirst()
    }

    if (plan) {
      const now = new Date()
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      await prisma.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          puBalance: new Decimal(10), // Give minimal starting balance? Or 0? Let's give 10 free PU.
          puLimit: plan.monthlyPuLimit,
          billingCycleStartDate: now,
          nextResetDate: nextMonth,
          puUsedThisCycle: new Decimal(0),
          overagePuUsed: new Decimal(0),
          status: 'ACTIVE'
        }
      })
      return new PuBillingSystem()
    }
  } catch (err) {
    console.error("Failed to auto-create subscription:", err)
    // Fallback
  }

  // Fallback to legacy if we absolutely cannot create a subscription
  return new TokenBillingSystem()
}

/**
 * Check which billing system user is using
 */
export async function getUserBillingType(userId: string): Promise<'PU' | 'TOKEN'> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  // We are migrating everyone to PU. 
  // If they don't have a sub, `getBillingSystem` will create one.
  // So effectively everyone is PU.
  return 'PU'
}
