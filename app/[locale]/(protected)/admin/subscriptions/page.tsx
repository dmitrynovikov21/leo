'use client'

import { useEffect, useState } from 'react'
import { getAllSubscriptions } from '@/actions/subscription-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Subscription {
  id: string
  userId: string
  userEmail: string
  userName: string
  planCode: string
  planName: string
  puBalance: number
  puLimit: number
  status: string
  createdAt: string
  nextResetDate: string
}

const statusTranslations: Record<string, string> = {
  ACTIVE: 'Активна',
  PAST_DUE: 'Просрочка',
  CANCELED: 'Отменена',
  FROZEN: 'Заморожена',
  SUSPENDED: 'Приостановлена',
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const result = await getAllSubscriptions(50, 0)
        setSubscriptions(result.subscriptions)
        setTotal(result.total)
      } catch (error) {
        console.error('Ошибка при загрузке подписок:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscriptions()
  }, [])

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
      PAST_DUE: 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400',
      CANCELED: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
      FROZEN: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
      SUSPENDED: 'bg-muted text-muted-foreground',
    }
    return colors[status] || 'bg-muted text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="p-6">Загрузка...</div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Подписки пользователей</h1>
        <p className="text-muted-foreground">Управление подписками и биллингом</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все подписки</CardTitle>
          <CardDescription>Всего: {total} активных подписок</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Пользователь</th>
                  <th className="text-left px-4 py-3 font-semibold">Тариф</th>
                  <th className="text-left px-4 py-3 font-semibold">Баланс PU</th>
                  <th className="text-left px-4 py-3 font-semibold">Статус</th>
                  <th className="text-left px-4 py-3 font-semibold">Сброс биллинга</th>
                  <th className="text-left px-4 py-3 font-semibold">Создана</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{sub.userName || sub.userEmail}</p>
                        <p className="text-sm text-muted-foreground">{sub.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{sub.planName}</p>
                        <p className="text-sm text-muted-foreground">{sub.planCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono">
                          {sub.puBalance.toFixed(2)} / {sub.puLimit}
                        </p>
                        <div className="w-32 bg-muted rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${sub.puBalance < 0 ? 'bg-red-600' : 'bg-green-600'
                              }`}
                            style={{
                              width: `${Math.min((sub.puBalance / sub.puLimit) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(sub.status)}`}>
                        {statusTranslations[sub.status] || sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(sub.nextResetDate).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Активные подписки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s) => s.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Просрочки платежей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {subscriptions.filter((s) => s.status === 'PAST_DUE').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ежемесячный доход</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground text-sm">
              См. <a href="/admin/plans" className="underline">Тарифы</a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Низкий баланс (&lt;50 PU)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {subscriptions.filter((s) => s.puBalance < 50 && s.puBalance > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
