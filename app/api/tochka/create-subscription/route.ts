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

    // Check no existing active subscription
    const existingSub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
    })

    if (existingSub && existingSub.status === 'ACTIVE' && existingSub.tochkaOperationId) {
      return new NextResponse('Active Tochka subscription already exists', { status: 409 })
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

    const result = await tochka.createSubscriptionWithReceipt({
      amount: parseFloat(plan.priceMonthlyRub.toString()),
      purpose: `Подписка ${plan.name}`,
      redirectUrl: redirectUrl || `${appUrl}/billing`,
      failRedirectUrl: `${appUrl}/billing?payment=failed`,
      email: user.email,
      itemName: `Подписка ${plan.name} (ежемесячно)`,
      trancheCount: 12,
    })

    // Upsert UserSubscription with PENDING-like state
    const now = new Date()

    if (existingSub) {
      await prisma.userSubscription.update({
        where: { userId: session.user.id },
        data: {
          planId: plan.id,
          tochkaOperationId: result.operationId,
          status: 'SUSPENDED', // Will become ACTIVE on first webhook
          puLimit: plan.monthlyPuLimit,
          billingCycleStartDate: now,
          nextResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    } else {
      await prisma.userSubscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          tochkaOperationId: result.operationId,
          status: 'SUSPENDED', // Will become ACTIVE on first webhook
          puBalance: new Decimal(0),
          puLimit: plan.monthlyPuLimit,
          billingCycleStartDate: now,
          nextResetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }

    return NextResponse.json({ paymentLink: result.paymentLink })
  } catch (error: any) {
    console.error('[Tochka] Create subscription error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
