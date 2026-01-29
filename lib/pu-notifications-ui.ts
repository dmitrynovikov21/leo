import { prisma } from '@/lib/db'
import { Prisma, PuNotificationType } from '@prisma/client'
import { toast } from 'sonner'

/**
 * Create UI notification (stored in DB, not sent via email)
 * This replaces email notifications with in-app toast/banner messages
 */
export async function createUiNotification(
  userId: string,
  type: PuNotificationType,
  data: {
    usagePercent: number
    puBalance: number
    puLimit: number
  }
) {
  try {
    const billingCycleDate = new Date()
    billingCycleDate.setHours(0, 0, 0, 0)

    // Check if already created this cycle
    const existing = await prisma.puNotification.findUnique({
      where: {
        userId_type_billingCycleDate: {
          userId,
          type,
          billingCycleDate,
        },
      },
    })

    if (existing) {
      return // Already notified this cycle
    }

    // Create notification record
    const notification = await prisma.puNotification.create({
      data: {
        userId,
        type,
        puBalance: data.puBalance,
        puLimit: data.puLimit,
        usagePercent: Math.round(data.usagePercent),
        billingCycleDate,
        wasSent: true, // Mark as sent immediately (for UI)
        sentAt: new Date(),
        channel: 'UI', // Mark as UI notification
      },
    })

    return notification
  } catch (error) {
    console.error('[createUiNotification] Error:', error)
  }
}

/**
 * Get notification message for UI display
 */
export function getNotificationMessage(
  type: PuNotificationType,
  data: { usagePercent: number; puBalance: number; puLimit: number }
) {
  const messages: Record<
    PuNotificationType,
    {
      title: string
      message: string
      icon: string
      variant: 'warning' | 'destructive' | 'info'
    }
  > = {
    WARNING_80_PERCENT: {
      title: '⚠️ Предупреждение',
      message: `Вы использовали ${data.usagePercent.toFixed(0)}% месячного лимита (${data.puLimit} PU)`,
      icon: '⚠️',
      variant: 'warning',
    },
    LIMIT_REACHED: {
      title: '✋ Лимит исчерпан',
      message: `Ваш месячный лимит (${data.puLimit} PU) полностью исчерпан. Вы находитесь в режиме овердрафта.`,
      icon: '✋',
      variant: 'warning',
    },
    OVERDRAFT_WARNING: {
      title: '🚨 Предупреждение овердрафта',
      message: `Ваш баланс: ${data.puBalance.toFixed(2)} PU. Сервис будет заблокирован при балансе ниже -5 PU.`,
      icon: '🚨',
      variant: 'destructive',
    },
    SERVICE_BLOCKED: {
      title: '❌ Сервис заблокирован',
      message: `Баланс ${data.puBalance.toFixed(2)} PU ниже лимита. Пополните баланс для продолжения работы.`,
      icon: '❌',
      variant: 'destructive',
    },
  }

  return messages[type] || messages.WARNING_80_PERCENT
}

/**
 * Get unread notifications for user
 */
export async function getUserNotifications(userId: string) {
  try {
    const notifications = await prisma.puNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return notifications
  } catch (error) {
    console.error('[getUserNotifications] Error:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.puNotification.update({
      where: { id: notificationId },
      data: { wasSent: true },
    })
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error)
  }
}
