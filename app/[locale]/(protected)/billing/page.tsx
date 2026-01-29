'use client'

import { useEffect, useState } from 'react'
import { getCurrentUserSubscription, getUserPuHistory, getAvailablePuPacks } from '@/actions/subscription-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, TrendingUp, Zap } from 'lucide-react'

interface Subscription {
  id: string
  planCode: string
  planName: string
  puBalance: number
  puLimit: number
  billingCycleStartDate: Date
  nextResetDate: Date
  puUsedThisCycle: number
  isOverdraft: boolean
  isBlocked: boolean
  status: string
  usagePercent: number
  daysUntilReset: number
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [history, setHistory] = useState([])
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sub, hist, availablePacks] = await Promise.all([
          getCurrentUserSubscription(),
          getUserPuHistory(20, 0),
          getAvailablePuPacks(),
        ])

        setSubscription(sub)
        setHistory(hist.transactions)
        setPacks(availablePacks)
      } catch (error) {
        console.error('Ошибка при загрузке данных биллинга:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div className="p-6">Загрузка...</div>
  }

  if (!subscription) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Активная подписка не найдена. Пожалуйста, выберите план для начала.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const progressPercent = Math.min((subscription.puUsedThisCycle / subscription.puLimit) * 100, 100)
  const statusColor = subscription.isBlocked ? 'text-red-600' :
                      subscription.isOverdraft ? 'text-orange-600' :
                      progressPercent > 80 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Биллинг и использование</h1>
        <p className="text-gray-600">Управляйте своими Processing Units и подпиской</p>
      </div>

      {/* Alerts */}
      {subscription.isBlocked && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Ваш сервис приостановлен. Баланс PU ниже -5.0. Пожалуйста, купите дополнительные Processing Units для продолжения.
          </AlertDescription>
        </Alert>
      )}

      {subscription.isOverdraft && !subscription.isBlocked && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Вы используете резервный овердрафт. Текущий баланс: {subscription.puBalance.toFixed(2)} PU
          </AlertDescription>
        </Alert>
      )}

      {progressPercent > 80 && !subscription.isOverdraft && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Вы использовали {progressPercent.toFixed(0)}% месячного лимита. Рассмотрите возможность обновления или покупки дополнительных Processing Units.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan & Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Текущий план</CardTitle>
          <CardDescription>{subscription.planName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PU Balance */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Processing Units (PU)</span>
              <span className={`text-2xl font-bold ${statusColor}`}>
                {subscription.puBalance.toFixed(1)} / {subscription.puLimit.toFixed(0)} PU
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  subscription.isBlocked ? 'bg-red-600' :
                  subscription.isOverdraft ? 'bg-orange-600' :
                  progressPercent > 80 ? 'bg-yellow-500' : 'bg-green-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Использовано: {subscription.puUsedThisCycle.toFixed(1)} PU ({progressPercent.toFixed(0)}%)
            </p>
          </div>

          {/* Reset Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Следующий сброс:</span> {subscription.nextResetDate.toLocaleDateString('ru-RU')} ({subscription.daysUntilReset} дней)
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Ваш месячный лимит сбрасывается каждый {subscription.billingCycleStartDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Purchase PU Packs */}
      {packs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Купить дополнительные Processing Units
            </CardTitle>
            <CardDescription>
              Купите дополнительные пакеты PU для увеличения месячного лимита
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <h3 className="font-bold text-lg">{pack.name}</h3>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{pack.puAmount} PU</p>
                  <p className="text-gray-600 mt-1">{pack.priceRub} ₽</p>
                  <p className="text-xs text-green-600 mt-1">Сэкономить {pack.discount}</p>
                  <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Купить
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              История использования
            </CardTitle>
            <CardDescription>Последние 20 транзакций</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((tx: any) => (
                <div key={tx.id} className="flex justify-between items-center pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-gray-600">{new Date(tx.createdAt).toLocaleString('ru-RU')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.puAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.puAmount > 0 ? '+' : ''}{parseFloat(tx.puAmount).toFixed(2)} PU
                    </p>
                    <p className="text-sm text-gray-600">Баланс: {parseFloat(tx.balanceAfter).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
