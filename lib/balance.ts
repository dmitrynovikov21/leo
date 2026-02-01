import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { TransactionType } from '@prisma/client'

/**
 * Get user's current token balance
 */
export async function getUserBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  return parseFloat(user.tokenBalance.toString())
}

/**
 * Check if user has sufficient balance for operation
 */
export async function checkUserBalance(userId: string, requiredTokens: number): Promise<boolean> {
  const balance = await getUserBalance(userId)
  return balance >= requiredTokens
}

/**
 * Deduct tokens from user balance (internal operation with transaction)
 */
export async function deductTokens(params: {
  userId: string
  amount: number
  description: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { userId, amount, description, metadata } = params

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    const balanceBefore = parseFloat(user.tokenBalance.toString())
    const balanceAfter = balanceBefore - amount

    // Prevent negative balance (should not happen, but safety check)
    if (balanceAfter < 0) {
      throw new Error(
        `Insufficient balance for user ${userId}. Required: ${amount}, Available: ${balanceBefore}`
      )
    }

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: {
        tokenBalance: new Decimal(balanceAfter),
      },
    })

    // Record transaction
    await tx.tokenTransaction.create({
      data: {
        userId,
        type: TransactionType.DEDUCTION,
        amount: new Decimal(-amount), // Negative for deduction
        balanceBefore: new Decimal(balanceBefore),
        balanceAfter: new Decimal(balanceAfter),
        description,
        metadata,
      },
    })
  })
}

/**
 * Add tokens to user balance (internal operation with transaction)
 */
export async function addTokens(params: {
  userId: string
  amount: number
  type: 'TOPUP' | 'REFUND' | 'ADJUSTMENT'
  description: string
  metadata?: Record<string, any>
  createdBy?: string
}): Promise<void> {
  const { userId, amount, type, description, metadata, createdBy } = params

  // Map string type to TransactionType enum
  const transactionType = type === 'TOPUP' ? TransactionType.TOPUP :
                          type === 'REFUND' ? TransactionType.REFUND :
                          TransactionType.ADJUSTMENT

  // Use transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    })

    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    const balanceBefore = parseFloat(user.tokenBalance.toString())
    const balanceAfter = balanceBefore + amount

    // Update user balance
    await tx.user.update({
      where: { id: userId },
      data: {
        tokenBalance: new Decimal(balanceAfter),
      },
    })

    // Record transaction
    await tx.tokenTransaction.create({
      data: {
        userId,
        type: transactionType,
        amount: new Decimal(amount),
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
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const transactions = await prisma.tokenTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.tokenTransaction.count({
    where: { userId },
  })

  return {
    transactions: transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount.toString()),
      balanceBefore: parseFloat(tx.balanceBefore.toString()),
      balanceAfter: parseFloat(tx.balanceAfter.toString()),
      description: tx.description,
      metadata: tx.metadata,
      createdAt: tx.createdAt,
      createdBy: tx.createdBy,
    })),
    total,
  }
}
