'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserBalance } from '@/actions/balance'
import { Button } from '@/components/ui/button'
import { Coins, Loader2 } from 'lucide-react'
import Link from 'next/link'

export function BalanceDisplay() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalance()
    const interval = setInterval(loadBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadBalance = async () => {
    try {
      const data = await getCurrentUserBalance()
      setBalance(data.balance)
    } catch (error) {
      console.error('Error loading balance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (balance === null && !loading) {
    return null
  }

  return (
    <div className='flex items-center gap-2'>
      {loading ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        <>
          <Coins className='h-4 w-4 text-yellow-600' />
          <span className='text-sm font-medium'>
            {balance !== null ? balance.toLocaleString() : '—'}
          </span>
          <Button size='sm' variant='outline' asChild>
            <Link href='/dashboard/billing'>Пополнить</Link>
          </Button>
        </>
      )}
    </div>
  )
}
