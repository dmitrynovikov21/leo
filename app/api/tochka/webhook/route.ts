import { prisma } from '@/lib/db'
import { TochkaService } from '@/lib/tochka'
import { resetSubscriptionCycle, unfreezeUserData } from '@/lib/subscription-manager'
import { Decimal } from '@prisma/client/runtime/library'
import { addMonths } from 'date-fns'

export async function POST(req: Request) {
  try {
    // Tochka sends JWT as raw text body
    const jwtToken = await req.text()

    if (!jwtToken || jwtToken.trim().length === 0) {
      return new Response('Empty body', { status: 400 })
    }

    const tochka = new TochkaService()
    let payload

    try {
      payload = await tochka.verifyWebhookJwt(jwtToken.trim())
    } catch (verifyError) {
      console.error('[Tochka Webhook] JWT verification failed:', verifyError)
      return new Response('Invalid JWT', { status: 401 })
    }

    const { operationId, status, webhookType } = payload

    console.log(`[Tochka Webhook] operationId=${operationId} status=${status} type=${webhookType}`)

    // Only process acquiring payment webhooks
    if (webhookType !== 'acquiringInternetPayment') {
      return new Response('OK', { status: 200 })
    }

    // Only process approved payments
    if (status !== 'APPROVED') {
      console.log(`[Tochka Webhook] Ignoring status=${status} for operationId=${operationId}`)
      return new Response('OK', { status: 200 })
    }

    // Find subscription by operationId
    const sub = await prisma.userSubscription.findUnique({
      where: { tochkaOperationId: operationId },
      include: { plan: true },
    })

    if (!sub) {
      console.error(`[Tochka Webhook] No subscription found for operationId=${operationId}`)
      return new Response('OK', { status: 200 })
    }

    // Idempotency: check if we already processed this payment for this cycle
    const existingTx = await prisma.puTransaction.findFirst({
      where: {
        userId: sub.userId,
        metadata: {
          path: ['tochkaOperationId'],
          equals: operationId,
        },
        // Check this billing cycle
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24h
        },
      },
    })

    if (existingTx) {
      console.log(`[Tochka Webhook] Already processed operationId=${operationId} recently`)
      return new Response('OK', { status: 200 })
    }

    if (sub.status === 'SUSPENDED' || sub.status === 'PAST_DUE') {
      // First payment — activate subscription
      const now = new Date()

      await prisma.$transaction(async (tx) => {
        // Activate subscription and grant PU
        await tx.userSubscription.update({
          where: { userId: sub.userId },
          data: {
            status: 'ACTIVE',
            puBalance: sub.plan.monthlyPuLimit,
            puUsedThisCycle: new Decimal(0),
            overagePuUsed: new Decimal(0),
            billingCycleStartDate: now,
            nextResetDate: addMonths(now, 1),
            isOverdraft: false,
            isBlocked: false,
          },
        })

        // Record grant transaction
        await tx.puTransaction.create({
          data: {
            userId: sub.userId,
            type: 'SUBSCRIPTION_GRANT',
            puAmount: sub.plan.monthlyPuLimit,
            balanceBefore: new Decimal(0),
            balanceAfter: sub.plan.monthlyPuLimit,
            source: 'TOCHKA_ACTIVATION',
            description: `Tochka subscription activated: ${sub.plan.name}`,
            costRub: sub.plan.priceMonthlyRub,
            metadata: {
              tochkaOperationId: operationId,
              tochkaStatus: status,
            },
          },
        })
      })

      // Unfreeze data if it was frozen
      if (sub.status === 'PAST_DUE') {
        try {
          await unfreezeUserData(sub.userId)
        } catch (e) {
          console.error(`[Tochka Webhook] Error unfreezing data for user ${sub.userId}:`, e)
        }
      }

      console.log(`[Tochka Webhook] Activated subscription for user ${sub.userId}`)
    } else if (sub.status === 'ACTIVE') {
      // Monthly auto-renewal — reset cycle
      await resetSubscriptionCycle(sub.userId)

      // Record the payment metadata
      const latestTx = await prisma.puTransaction.findFirst({
        where: { userId: sub.userId, type: 'SUBSCRIPTION_GRANT' },
        orderBy: { createdAt: 'desc' },
      })

      if (latestTx) {
        await prisma.puTransaction.update({
          where: { id: latestTx.id },
          data: {
            source: 'TOCHKA_RENEWAL',
            costRub: sub.plan.priceMonthlyRub,
            metadata: {
              tochkaOperationId: operationId,
              tochkaStatus: status,
            },
          },
        })
      }

      // Unfreeze if data was frozen
      const frozenCount = await prisma.frozenData.count({ where: { userId: sub.userId } })
      if (frozenCount > 0) {
        try {
          await unfreezeUserData(sub.userId)
        } catch (e) {
          console.error(`[Tochka Webhook] Error unfreezing data for user ${sub.userId}:`, e)
        }
      }

      console.log(`[Tochka Webhook] Reset cycle for user ${sub.userId}`)
    }

    // Tochka requires 200 response, retries 30x at 10s intervals otherwise
    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('[Tochka Webhook] Error:', error)
    // Return 200 even on error to prevent Tochka retry storms
    // Errors are logged for investigation
    return new Response('OK', { status: 200 })
  }
}
