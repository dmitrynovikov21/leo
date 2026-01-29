import { prisma } from '@/lib/db'
import { Prisma, PuNotificationType } from '@prisma/client'

/**
 * Check usage thresholds and send notifications
 */
export async function checkAndSendNotifications(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  usagePercent: number,
  puBalance: number,
  billingCycleDate: Date
) {
  const sub = await tx.userSubscription.findUnique({ where: { userId } })
  if (!sub) return

  const cycleStart = new Date(billingCycleDate)
  cycleStart.setHours(0, 0, 0, 0)

  // 80% warning
  if (usagePercent >= 80 && usagePercent < 100) {
    await createNotificationIfNeeded(
      tx,
      userId,
      'WARNING_80_PERCENT',
      usagePercent,
      puBalance,
      cycleStart,
      sub.puLimit
    )
  }

  // 100% limit reached (entering overdraft)
  if (usagePercent >= 100 && puBalance >= 0) {
    await createNotificationIfNeeded(
      tx,
      userId,
      'LIMIT_REACHED',
      100,
      puBalance,
      cycleStart,
      sub.puLimit
    )
  }

  // Overdraft warning
  if (puBalance < 0 && puBalance >= -5.0) {
    await createNotificationIfNeeded(
      tx,
      userId,
      'OVERDRAFT_WARNING',
      usagePercent,
      puBalance,
      cycleStart,
      sub.puLimit
    )
  }

  // Service blocked
  if (puBalance < -5.0 && !sub.isBlocked) {
    await createNotificationIfNeeded(
      tx,
      userId,
      'SERVICE_BLOCKED',
      usagePercent,
      puBalance,
      cycleStart,
      sub.puLimit
    )
  }
}

/**
 * Create notification if not already sent this cycle
 */
async function createNotificationIfNeeded(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  type: PuNotificationType,
  usagePercent: number,
  puBalance: number,
  billingCycleDate: Date,
  puLimit: any
) {
  // Check if already sent this cycle
  const existing = await tx.puNotification.findUnique({
    where: {
      userId_type_billingCycleDate: {
        userId,
        type,
        billingCycleDate,
      },
    },
  })

  if (existing) {
    return // Already sent
  }

  // Create notification record
  await tx.puNotification.create({
    data: {
      userId,
      type,
      puBalance: puBalance,
      puLimit: parseFloat(puLimit.toString()),
      usagePercent: Math.round(usagePercent),
      billingCycleDate,
      wasSent: false,
    },
  })
}

/**
 * Get pending notifications to send
 */
export async function getPendingNotifications(limit: number = 100) {
  return prisma.puNotification.findMany({
    where: { wasSent: false },
    include: { user: true },
    take: limit,
  })
}

/**
 * Mark notification as sent
 */
export async function markNotificationAsSent(notificationId: string) {
  await prisma.puNotification.update({
    where: { id: notificationId },
    data: {
      wasSent: true,
      sentAt: new Date(),
      channel: 'EMAIL',
    },
  })
}

/**
 * Get notification templates
 */
export function getNotificationTemplate(
  type: PuNotificationType,
  data: { usagePercent: number; puBalance: number; puLimit: number }
) {
  const templates: Record<PuNotificationType, { subject: string; text: string }> = {
    WARNING_80_PERCENT: {
      subject: '⚠️ Вы использовали 80% лимита Processing Units',
      text: `Здравствуйте!

Вы использовали ${data.usagePercent.toFixed(0)}% вашего месячного лимита PU (${data.puLimit} PU).

Вскоре истечет ваш лимит. Рассмотрите возможность приобретения дополнительного пакета Processing Units для беспрерывной работы.

С уважением,
Команда поддержки`,
    },
    LIMIT_REACHED: {
      subject: '✋ Лимит Processing Units исчерпан',
      text: `Здравствуйте!

Ваш месячный лимит Processing Units (${data.puLimit} PU) полностью исчерпан.

Вы находитесь в режиме овердрафта и можете продолжить работу с отрицательным балансом до -5 PU. После этого сервис будет заблокирован.

Приобретите дополнительный пакет PU немедленно, чтобы продолжить без ограничений.

С уважением,
Команда поддержки`,
    },
    OVERDRAFT_WARNING: {
      subject: '🚨 Предупреждение овердрафта - срочно пополните баланс',
      text: `Внимание!

Ваш баланс Processing Units: ${data.puBalance.toFixed(2)} PU.

Вы находитесь в режиме овердрафта. Сервис будет заблокирован при балансе ниже -5 PU.

Пожалуйста, немедленно пополните баланс, чтобы избежать блокировки.

С уважением,
Команда поддержки`,
    },
    SERVICE_BLOCKED: {
      subject: '❌ Критично! Сервис заблокирован из-за недостатка средств',
      text: `СРОЧНО!

Ваш баланс Processing Units достиг критической отметки: ${data.puBalance.toFixed(2)} PU.

СЕРВИС ЗАБЛОКИРОВАН. Вы больше не можете использовать платформу.

Пожалуйста, немедленно пополните баланс на не менее 5 PU, чтобы разблокировать доступ.

Восстановить доступ: https://ваш-сайт.com/billing

С уважением,
Команда поддержки`,
    },
  }

  return templates[type]
}
