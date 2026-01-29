import { prisma } from '@/lib/db'
import { getUserBalance, checkUserBalance as checkTokenBalance, deductTokens, addTokens } from '@/lib/balance'
import { checkPuAvailable, deductPu, getPuBalance } from '@/lib/pu-balance'

/**
 * Unified billing interface - adapts between token and PU systems
 */
export interface BillingSystem {
  checkBalance(userId: string, requiredAmount: number): Promise<boolean>
  deductUsage(userId: string, amount: number, metadata: any): Promise<void>
  getBalance(userId: string): Promise<number>
  addBalance(userId: string, amount: number, source: string): Promise<void>
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

  async addBalance(userId: string, amount: number, source: string): Promise<void> {
    await addTokens({
      userId,
      amount,
      type: 'TOPUP',
      description: `Balance top-up: ${source}`,
      metadata: { source },
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

  async addBalance(userId: string, amount: number, source: string): Promise<void> {
    const sub = await prisma.userSubscription.findUnique({ where: { userId } })
    if (!sub) throw new Error('User subscription not found')

    const balanceBefore = sub.puBalance
    const balanceAfter = balanceBefore + amount

    await prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { userId },
        data: {
          puBalance: balanceAfter,
          isBlocked: balanceAfter < -5.0,
          isOverdraft: balanceAfter < 0,
        },
      })

      await tx.puTransaction.create({
        data: {
          userId,
          type: 'PACK_TOPUP',
          puAmount: amount,
          balanceBefore,
          balanceAfter,
          source,
          description: `PU pack purchased: ${source}`,
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

  return sub ? new PuBillingSystem() : new TokenBillingSystem()
}

/**
 * Check which billing system user is using
 */
export async function getUserBillingType(userId: string): Promise<'PU' | 'TOKEN'> {
  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  return sub ? 'PU' : 'TOKEN'
}
