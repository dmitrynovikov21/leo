import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { TochkaService } from '@/lib/tochka'
import { Decimal } from '@prisma/client/runtime/library'
import { NextResponse } from 'next/server'

// PU packs available for purchase
const PU_PACKS = [
  { id: 'pack_100', puAmount: 100, priceRub: 700 },
  { id: 'pack_250', puAmount: 250, priceRub: 1700 },
  { id: 'pack_500', puAmount: 500, priceRub: 3300 },
  { id: 'pack_1000', puAmount: 1000, priceRub: 6500 },
]

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { packId, redirectUrl } = body

    if (!packId) {
      return new NextResponse('packId is required', { status: 400 })
    }

    const pack = PU_PACKS.find(p => p.id === packId)
    if (!pack) {
      return new NextResponse('Invalid pack', { status: 400 })
    }

    // Check user has an active subscription
    const sub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'CANCELED')) {
      return new NextResponse('Активная подписка не найдена', { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const tochka = new TochkaService()

    const result = await tochka.createPayment({
      amount: pack.priceRub,
      purpose: `Пополнение баланса: ${pack.puAmount} PU`,
      redirectUrl: redirectUrl || `${appUrl}/dashboard/billing?topup=success`,
      failRedirectUrl: `${appUrl}/dashboard/billing?topup=failed`,
      paymentMode: ['sbp', 'card'],
    })

    // Create pending topup transaction
    await prisma.puTransaction.create({
      data: {
        userId: session.user.id,
        type: 'PACK_TOPUP',
        puAmount: new Decimal(pack.puAmount),
        balanceBefore: sub.puBalance,
        balanceAfter: sub.puBalance, // Will be updated on webhook
        source: 'TOPUP_PENDING',
        description: `Пополнение ${pack.puAmount} PU за ₽${pack.priceRub} (ожидание оплаты)`,
        costRub: new Decimal(pack.priceRub),
        metadata: {
          tochkaOperationId: result.operationId,
          packId: pack.id,
          puAmount: pack.puAmount,
          priceRub: pack.priceRub,
          status: 'PENDING',
        },
      },
    })

    return NextResponse.json({ paymentLink: result.paymentLink })
  } catch (error: any) {
    console.error('[Tochka] Create topup error:', error)
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
