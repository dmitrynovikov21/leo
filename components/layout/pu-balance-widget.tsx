'use client'

import { useEffect, useState } from 'react'
import { getUserSubscription } from '@/lib/subscription-manager'
import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function PuBalanceWidget() {
  const [balance, setBalance] = useState<{ puBalance: number; puLimit: number; isBlocked: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const sub = await getUserSubscription('')
        if (sub) {
          setBalance({
            puBalance: sub.puBalance,
            puLimit: sub.puLimit,
            isBlocked: sub.isBlocked,
          })
        }
      } catch (error) {
        console.error('Error loading balance:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBalance()
    // Refresh every 30 seconds
    const interval = setInterval(loadBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !balance) {
    return null
  }

  const usagePercent = (balance.puBalance / balance.puLimit) * 100
  const statusColor = balance.isBlocked
    ? 'bg-red-100 text-red-800'
    : usagePercent > 100
      ? 'bg-orange-100 text-orange-800'
      : usagePercent > 80
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800'

  return (
    <Link href="/dashboard/billing">
      <div className={`px-3 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${statusColor}`}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span className="font-semibold text-sm">
            {balance.puBalance.toFixed(1)} / {balance.puLimit.toFixed(0)} PU
          </span>
        </div>
      </div>
    </Link>
  )
}
