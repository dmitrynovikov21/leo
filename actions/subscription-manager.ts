'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { getUserSubscription } from '@/lib/subscription-manager'
import { getPuTransactionHistory } from '@/lib/pu-balance'

/**
 * Get current user's subscription
 */
export async function getCurrentUserSubscription() {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const sub = await getUserSubscription(session.user.id)

  if (!sub) {
    return null
  }

  return {
    ...sub,
    usagePercent: (sub.puUsedThisCycle / sub.puLimit) * 100,
    daysUntilReset: Math.ceil(
      (sub.nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  }
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  })

  return plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    monthlyPuLimit: parseFloat(plan.monthlyPuLimit.toString()),
    priceMonthlyRub: parseFloat(plan.priceMonthlyRub.toString()),
    features: plan.features as any[],
    stripePriceId: plan.stripePriceId,
  }))
}

/**
 * Get user's PU transaction history
 */
export async function getUserPuHistory(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  return getPuTransactionHistory(session.user.id, limit, offset)
}

/**
 * Create a checkout session for PU pack purchase
 */
export async function createPuPackCheckout(puAmount: number, packName: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get user's email
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  if (!user?.email) {
    throw new Error('User email not found')
  }

  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(puAmount * 100), // Assuming 1 PU = 1 RUB for simplicity, adjust as needed
    currency: 'rub',
    metadata: {
      userId: session.user.id,
      type: 'pu_pack',
      puAmount: puAmount.toString(),
      packName,
    },
    description: `PU Pack purchase: ${packName}`,
  })

  return {
    clientSecret: paymentIntent.client_secret,
    amount: puAmount,
    packName,
  }
}

/**
 * Subscribe user to a plan
 */
export async function subscribeToplan(planCode: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  // Get plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: planCode },
  })

  if (!plan) {
    throw new Error('Plan not found')
  }

  // Check if user already has a subscription
  const existingSub = await prisma.userSubscription.findUnique({
    where: { userId: session.user.id },
  })

  if (existingSub) {
    throw new Error('User already has a subscription')
  }

  // Create subscription
  const now = new Date()
  const nextReset = new Date(now)
  nextReset.setMonth(nextReset.getMonth() + 1)

  const sub = await prisma.userSubscription.create({
    data: {
      userId: session.user.id,
      planId: plan.id,
      puBalance: plan.monthlyPuLimit,
      puLimit: plan.monthlyPuLimit,
      billingCycleStartDate: now,
      nextResetDate: nextReset,
      status: 'ACTIVE',
    },
  })

  // Record initial grant transaction
  await prisma.puTransaction.create({
    data: {
      userId: session.user.id,
      type: 'SUBSCRIPTION_GRANT',
      puAmount: plan.monthlyPuLimit,
      balanceBefore: 0,
      balanceAfter: plan.monthlyPuLimit,
      source: 'SUBSCRIPTION_GRANT',
      description: `${plan.name} plan subscription: ${plan.monthlyPuLimit} PU`,
    },
  })

  return {
    success: true,
    subscriptionId: sub.id,
  }
}

/**
 * Get available PU packs for purchase
 */
export async function getAvailablePuPacks() {
  // Standard packs available for all users
  return [
    {
      id: 'pack_100',
      name: '100 PU Pack',
      puAmount: 100,
      priceRub: 700,
      discount: '12%',
    },
    {
      id: 'pack_250',
      name: '250 PU Pack',
      puAmount: 250,
      priceRub: 1700,
      discount: '12%',
    },
    {
      id: 'pack_500',
      name: '500 PU Pack',
      puAmount: 500,
      priceRub: 3300,
      discount: '12%',
    },
    {
      id: 'pack_1000',
      name: '1000 PU Pack',
      puAmount: 1000,
      priceRub: 6500,
      discount: '12%',
    },
  ]
}

/**
 * Admin: Get all user subscriptions
 */
export async function getAllSubscriptions(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin only')
  }

  const subs = await prisma.userSubscription.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.userSubscription.count()

  return {
    subscriptions: subs.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      userEmail: sub.user.email,
      userName: sub.user.name,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      puBalance: parseFloat(sub.puBalance.toString()),
      puLimit: parseFloat(sub.puLimit.toString()),
      status: sub.status,
      createdAt: sub.createdAt,
      nextResetDate: sub.nextResetDate,
    })),
    total,
  }
}

/**
 * Admin: Manually reset a user's subscription cycle
 */
export async function manuallyResetSubscription(userId: string) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin only')
  }

  const sub = await prisma.userSubscription.findUnique({
    where: { userId },
  })

  if (!sub) {
    throw new Error('User subscription not found')
  }

  const now = new Date()
  const nextReset = new Date(now)
  nextReset.setMonth(nextReset.getMonth() + 1)

  await prisma.$transaction(async (tx) => {
    // Record reset
    await tx.puTransaction.create({
      data: {
        userId,
        type: 'RESET',
        puAmount: -sub.puBalance,
        balanceBefore: sub.puBalance,
        balanceAfter: 0,
        source: 'MANUAL_RESET',
        description: `Manual reset by admin ${session.user.id}`,
        createdBy: session.user.id,
      },
    })

    // Grant new balance
    await tx.puTransaction.create({
      data: {
        userId,
        type: 'SUBSCRIPTION_GRANT',
        puAmount: sub.plan.monthlyPuLimit,
        balanceBefore: 0,
        balanceAfter: sub.plan.monthlyPuLimit,
        source: 'MANUAL_RESET',
        createdBy: session.user.id,
      },
    })

    // Update subscription
    await tx.userSubscription.update({
      where: { userId },
      data: {
        puBalance: sub.plan.monthlyPuLimit,
        puUsedThisCycle: 0,
        billingCycleStartDate: now,
        nextResetDate: nextReset,
      },
    })
  })

  return { success: true }
}
