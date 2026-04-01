import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { TochkaService } from '@/lib/tochka'
import { Decimal } from '@prisma/client/runtime/library'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { planId, redirectUrl } = body

    if (!planId) {
      return new NextResponse('planId is required', { status: 400 })
    }

    // Look up plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    })

    if (!plan || !plan.isActive) {
      return new NextResponse('Plan not found or inactive', { status: 404 })
    }

    // FREE plan should not go through payment
    if (plan.code === 'FREE' || plan.priceMonthlyRub.toNumber() === 0) {
      return new NextResponse('Бесплатный план не требует оплаты. Используйте отмену подписки.', { status: 400 })
    }

    // Check existing subscription
    const existingSub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
      include: { plan: true },
    })

    // Block downgrade via payment — downgrades should use cancelSubscription action
    if (existingSub && existingSub.status === 'ACTIVE' && existingSub.plan) {
      const currentPrice = existingSub.plan.priceMonthlyRub.toNumber()
      const newPrice = plan.priceMonthlyRub.toNumber()
      if (newPrice <= currentPrice && newPrice > 0) {
        return new NextResponse('Для понижения тарифа используйте отмену подписки', { status: 400 })
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    if (!user?.email) {
      return new NextResponse('User email is required', { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const tochka = new TochkaService()

    const result = await tochka.createPayment({
      amount: parseFloat(plan.priceMonthlyRub.toString()),
      purpose: `Подписка ${plan.name}`,
      redirectUrl: redirectUrl || `${appUrl}/billing?payment=success`,
      failRedirectUrl: `${appUrl}/billing?payment=failed`,
      paymentMode: ['sbp', 'card'],
    })

    const now = new Date()

    if (existingSub && (existingSub.status === 'ACTIVE' || existingSub.status === 'CANCELED')) {
      // Upgrade from existing plan — DON'T change planId yet, only on webhook
      await prisma.userSubscription.update({
        where: { userId: session.user.id },
        data: {
          tochkaOperationId: result.operationId,
          // Keep current planId, status, balance unchanged
        },
      })

      // Store pending upgrade info
      await prisma.puTransaction.create({
        data: {
          userId: session.user.id,
          type: 'SUBSCRIPTION_GRANT',
          puAmount: new Decimal(0),
          balanceBefore: existingSub.puBalance,
          balanceAfter: existingSub.puBalance,
          source: 'UPGRADE_PENDING',
          description: `Ожидание оплаты: переход на ${plan.name}`,
          costRub: plan.priceMonthlyRub,
          metadata: {
            tochkaOperationId: result.operationId,
            targetPlanId: plan.id,
            targetPlanName: plan.name,
            targetPuLimit: plan.monthlyPuLimit.toString(),
          },
        },
      })

      console.log(`[Tochka] Upgrade pending: user=${session.user.id} ${existingSub.plan.code} -> ${plan.code} opId=${result.operationId}`)
    } else if (existingSub) {
      // Re-subscribe from SUSPENDED/PAST_DUE/FROZEN
      await prisma.userSubscription.update({
        where: { userId: session.user.id },
        data: {
          planId: plan.id,
          tochkaOperationId: result.operationId,
          status: 'SUSPENDED',
          puLimit: plan.monthlyPuLimit,
          billingCycleStartDate: now,
          nextResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      console.log(`[Tochka] Re-subscribe pending: user=${session.user.id} plan=${plan.code} opId=${result.operationId}`)
    } else {
      // Brand new subscription
      await prisma.userSubscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          tochkaOperationId: result.operationId,
          status: 'SUSPENDED',
          puBalance: new Decimal(0),
          puLimit: plan.monthlyPuLimit,
          billingCycleStartDate: now,
          nextResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      console.log(`[Tochka] New subscription pending: user=${session.user.id} plan=${plan.code} opId=${result.operationId}`)
    }

    return NextResponse.json({ paymentLink: result.paymentLink })
  } catch (error: any) {
    console.error('[Tochka] Create subscription error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
