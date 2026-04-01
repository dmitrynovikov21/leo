import { prisma } from '@/lib/db'
import { TochkaService } from '@/lib/tochka'
import { resetSubscriptionCycle, unfreezeUserData } from '@/lib/subscription-manager'
import { Decimal } from '@prisma/client/runtime/library'
import { addMonths } from 'date-fns'

function log(msg: string, data?: any) {
  const ts = new Date().toISOString()
  if (data) {
    console.log(`[Tochka Webhook ${ts}] ${msg}`, JSON.stringify(data))
  } else {
    console.log(`[Tochka Webhook ${ts}] ${msg}`)
  }
}

export async function POST(req: Request) {
  try {
    const jwtToken = await req.text()

    if (!jwtToken || jwtToken.trim().length === 0) {
      log('ERROR: Empty body received')
      return new Response('Empty body', { status: 400 })
    }

    const tochka = new TochkaService()
    let payload

    try {
      payload = await tochka.verifyWebhookJwt(jwtToken.trim())
    } catch (verifyError) {
      log('ERROR: JWT verification failed', { error: String(verifyError) })
      return new Response('Invalid JWT', { status: 401 })
    }

    const { operationId, status, webhookType, amount } = payload as any

    log(`Received: opId=${operationId} status=${status} type=${webhookType} amount=${amount}`)

    if (webhookType !== 'acquiringInternetPayment') {
      log(`Skipping non-acquiring webhook type: ${webhookType}`)
      return new Response('OK', { status: 200 })
    }

    if (status !== 'APPROVED') {
      log(`Ignoring non-approved status: ${status} for opId=${operationId}`)
      return new Response('OK', { status: 200 })
    }

    // ── 1. Check for pending TOP-UP ──
    const pendingTopup = await prisma.puTransaction.findFirst({
      where: {
        source: 'TOPUP_PENDING',
        metadata: { path: ['tochkaOperationId'], equals: operationId },
      },
    })

    if (pendingTopup) {
      const meta = pendingTopup.metadata as any
      const puAmount = meta?.puAmount || 0

      log(`Found pending topup: user=${pendingTopup.userId} puAmount=${puAmount} priceRub=${meta?.priceRub}`)

      if (puAmount > 0) {
        const sub = await prisma.userSubscription.findUnique({
          where: { userId: pendingTopup.userId },
        })

        if (sub) {
          const newBalance = sub.puBalance.add(new Decimal(puAmount))

          await prisma.$transaction([
            prisma.userSubscription.update({
              where: { userId: pendingTopup.userId },
              data: { puBalance: newBalance },
            }),
            prisma.puTransaction.update({
              where: { id: pendingTopup.id },
              data: {
                balanceAfter: newBalance,
                source: 'TOPUP_COMPLETED',
                description: `Пополнение ${puAmount} PU за ₽${meta.priceRub}`,
                metadata: { ...meta, status: 'COMPLETED', tochkaStatus: status },
              },
            }),
          ])

          log(`TOP-UP COMPLETED: user=${pendingTopup.userId} +${puAmount} PU, balance: ${sub.puBalance} -> ${newBalance}`)
        } else {
          log(`ERROR: No subscription found for topup user=${pendingTopup.userId}`)
        }
      }

      return new Response('OK', { status: 200 })
    }

    // ── 2. Check for pending UPGRADE ──
    const pendingUpgrade = await prisma.puTransaction.findFirst({
      where: {
        source: 'UPGRADE_PENDING',
        metadata: { path: ['tochkaOperationId'], equals: operationId },
      },
    })

    if (pendingUpgrade) {
      const meta = pendingUpgrade.metadata as any
      const targetPlanId = meta?.targetPlanId
      const targetPuLimit = parseFloat(meta?.targetPuLimit || '0')

      log(`Found pending upgrade: user=${pendingUpgrade.userId} targetPlan=${meta?.targetPlanName} targetPuLimit=${targetPuLimit}`)

      const sub = await prisma.userSubscription.findUnique({
        where: { userId: pendingUpgrade.userId },
        include: { plan: true },
      })

      if (sub && targetPlanId) {
        const now = new Date()

        await prisma.$transaction(async (tx) => {
          // Switch to new plan and grant PU
          await tx.userSubscription.update({
            where: { userId: sub.userId },
            data: {
              planId: targetPlanId,
              status: 'ACTIVE',
              puBalance: new Decimal(targetPuLimit),
              puLimit: new Decimal(targetPuLimit),
              puUsedThisCycle: new Decimal(0),
              overagePuUsed: new Decimal(0),
              billingCycleStartDate: now,
              nextResetDate: addMonths(now, 1),
              isOverdraft: false,
              isBlocked: false,
            },
          })

          // Mark upgrade as completed
          await tx.puTransaction.update({
            where: { id: pendingUpgrade.id },
            data: {
              puAmount: new Decimal(targetPuLimit),
              balanceBefore: sub.puBalance,
              balanceAfter: new Decimal(targetPuLimit),
              source: 'UPGRADE_COMPLETED',
              description: `Переход на ${meta.targetPlanName}: ${targetPuLimit} PU`,
              metadata: { ...meta, status: 'COMPLETED', tochkaStatus: status },
            },
          })
        })

        log(`UPGRADE COMPLETED: user=${sub.userId} ${sub.plan.code} -> ${meta.targetPlanName}, PU: ${sub.puBalance} -> ${targetPuLimit}`)
      } else {
        log(`ERROR: No subscription found for upgrade user=${pendingUpgrade.userId}`)
      }

      return new Response('OK', { status: 200 })
    }

    // ── 3. Handle SUBSCRIPTION payment ──
    const sub = await prisma.userSubscription.findUnique({
      where: { tochkaOperationId: operationId },
      include: { plan: true },
    })

    if (!sub) {
      log(`ERROR: No subscription, topup, or upgrade found for opId=${operationId}`)
      return new Response('OK', { status: 200 })
    }

    log(`Found subscription: user=${sub.userId} plan=${sub.plan.code} status=${sub.status} puBalance=${sub.puBalance}`)

    // Idempotency check
    const existingTx = await prisma.puTransaction.findFirst({
      where: {
        userId: sub.userId,
        source: { in: ['TOCHKA_ACTIVATION', 'TOCHKA_RENEWAL'] },
        metadata: { path: ['tochkaOperationId'], equals: operationId },
      },
    })

    if (existingTx) {
      log(`Already processed opId=${operationId} (tx=${existingTx.id}), skipping`)
      return new Response('OK', { status: 200 })
    }

    if (sub.status === 'SUSPENDED' || sub.status === 'PAST_DUE') {
      // First payment — activate subscription
      const now = new Date()
      const prevBalance = sub.puBalance

      await prisma.$transaction(async (tx) => {
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

        await tx.puTransaction.create({
          data: {
            userId: sub.userId,
            type: 'SUBSCRIPTION_GRANT',
            puAmount: sub.plan.monthlyPuLimit,
            balanceBefore: new Decimal(0),
            balanceAfter: sub.plan.monthlyPuLimit,
            source: 'TOCHKA_ACTIVATION',
            description: `Подписка активирована: ${sub.plan.name}`,
            costRub: sub.plan.priceMonthlyRub,
            metadata: { tochkaOperationId: operationId, tochkaStatus: status },
          },
        })
      })

      if (sub.status === 'PAST_DUE') {
        try {
          await unfreezeUserData(sub.userId)
          log(`Unfroze data for user=${sub.userId}`)
        } catch (e) {
          log(`ERROR unfreezing data for user=${sub.userId}: ${e}`)
        }
      }

      log(`ACTIVATION: user=${sub.userId} plan=${sub.plan.code} PU: ${prevBalance} -> ${sub.plan.monthlyPuLimit}`)
    } else if (sub.status === 'ACTIVE' || sub.status === 'CANCELED') {
      // Monthly renewal or re-activation from canceled
      const prevBalance = sub.puBalance
      await resetSubscriptionCycle(sub.userId)

      // If was canceled, reactivate
      if (sub.status === 'CANCELED') {
        await prisma.userSubscription.update({
          where: { userId: sub.userId },
          data: { status: 'ACTIVE' },
        })
      }

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
            metadata: { tochkaOperationId: operationId, tochkaStatus: status },
          },
        })
      }

      const frozenCount = await prisma.frozenData.count({ where: { userId: sub.userId } })
      if (frozenCount > 0) {
        try {
          await unfreezeUserData(sub.userId)
          log(`Unfroze ${frozenCount} items for user=${sub.userId}`)
        } catch (e) {
          log(`ERROR unfreezing data for user=${sub.userId}: ${e}`)
        }
      }

      log(`RENEWAL: user=${sub.userId} plan=${sub.plan.code} PU: ${prevBalance} -> ${sub.plan.monthlyPuLimit}`)
    } else {
      log(`WARN: Unexpected subscription status=${sub.status} for user=${sub.userId}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    log(`FATAL ERROR: ${error.message}`, { stack: error.stack?.slice(0, 500) })
    return new Response('OK', { status: 200 })
  }
}
