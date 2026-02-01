'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { PuNotificationType } from '@prisma/client'
import { getNotificationMessage } from '@/lib/pu-notifications-ui'

interface Notification {
  id: string
  type: PuNotificationType
  puBalance: number
  puLimit: number
  usagePercent: number
  createdAt: Date
}

export function PuNotificationsDisplay({ notifications }: { notifications: Notification[] }) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([])

  useEffect(() => {
    setVisibleNotifications(notifications)
  }, [notifications])

  const dismissNotification = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (visibleNotifications.length === 0) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 max-w-md p-4 space-y-2">
      {visibleNotifications.map(notif => {
        const message = getNotificationMessage(notif.type, {
          usagePercent: notif.usagePercent,
          puBalance: notif.puBalance,
          puLimit: notif.puLimit
        })

        const bgColor = {
          warning: 'bg-yellow-50 border-yellow-200',
          destructive: 'bg-red-50 border-red-200',
          info: 'bg-blue-50 border-blue-200'
        }[message.variant]

        const iconColor = {
          warning: 'text-yellow-600',
          destructive: 'text-red-600',
          info: 'text-blue-600'
        }[message.variant]

        const Icon = message.variant === 'destructive' ? AlertTriangle : AlertCircle

        return (
          <div
            key={notif.id}
            className={`border rounded-lg p-4 shadow-lg ${bgColor}`}
          >
            <div className="flex gap-3">
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{message.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{message.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
