'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getUserBalance, addTokens, getTransactionHistory } from '@/lib/balance'

/**
 * Get current user's balance
 */
export async function getCurrentUserBalance() {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized: User not authenticated')
  }

  const balance = await getUserBalance(session.user.id)

  return {
    userId: session.user.id,
    balance,
  }
}

/**
 * Get a user's balance (admin only)
 */
export async function getUserBalanceAdmin(userId: string) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const balance = await getUserBalance(userId)

  return {
    userId,
    balance,
  }
}

/**
 * Add tokens to user balance (admin only)
 */
export async function addBalanceAdmin(params: {
  userId: string
  amount: number
  description: string
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  if (params.amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  await addTokens({
    userId: params.userId,
    amount: params.amount,
    type: 'ADJUSTMENT',
    description: params.description,
    createdBy: session.user.id,
  })

  const newBalance = await getUserBalance(params.userId)

  return {
    userId: params.userId,
    addedAmount: params.amount,
    newBalance,
  }
}

/**
 * Get transaction history for current user
 */
export async function getCurrentUserTransactionHistory(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized: User not authenticated')
  }

  const result = await getTransactionHistory(session.user.id, limit, offset)

  return {
    userId: session.user.id,
    transactions: result.transactions,
    total: result.total,
  }
}

/**
 * Get transaction history for any user (admin only)
 */
export async function getUserTransactionHistoryAdmin(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const result = await getTransactionHistory(userId, limit, offset)

  return {
    userId,
    transactions: result.transactions,
    total: result.total,
  }
}

/**
 * Search users by email or name (admin only)
 */
export async function searchUsers(query: string, limit: number = 50) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  if (!query || query.length < 2) {
    throw new Error('Search query must be at least 2 characters')
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      tokenBalance: true,
      createdAt: true,
    },
    take: limit,
  })

  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    tokenBalance: parseFloat(user.tokenBalance.toString()),
    createdAt: user.createdAt,
  }))
}

/**
 * Get all users with their balances (admin only)
 */
export async function getAllUsersWithBalances(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      tokenBalance: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.user.count()

  // Get last transaction for each user
  const usersWithLastTx = await Promise.all(
    users.map(async (user) => {
      const lastTransaction = await prisma.tokenTransaction.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, type: true },
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tokenBalance: parseFloat(user.tokenBalance.toString()),
        createdAt: user.createdAt,
        lastTransaction: lastTransaction?.createdAt || null,
        lastTransactionType: lastTransaction?.type || null,
      }
    })
  )

  return {
    users: usersWithLastTx,
    total,
  }
}
