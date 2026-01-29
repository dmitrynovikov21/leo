'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserBalance } from '@/actions/balance'
import { Button } from '@/components/ui/button'
import { Coins, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import TopupModal from '@/components/balance/topup-modal'

export function BalanceDisplay() {
  const router = useRouter()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopupModal, setShowTopupModal] = useState(false)

  useEffect(() => {
    loadBalance()

    // Refresh balance every 30 seconds
    const interval = setInterval(loadBalance, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadBalance = async () => {
    try {
      const data = await getCurrentUserBalance()
      setBalance(data.balance)
    } catch (error) {
      console.error('Error loading balance:', error)
      // Silently fail, user will see previous balance
    } finally {
      setLoading(false)
    }
  }

  const handleTopupSuccess = () => {
    setShowTopupModal(false)
    loadBalance()
    router.refresh()
  }

  if (balance === null && !loading) {
    return null
  }

  return (
    <>
      <div className='flex items-center gap-2'>
        {loading ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          <>
            <Coins className='h-4 w-4 text-yellow-600' />
            <span className='text-sm font-medium'>
              {balance !== null ? balance.toLocaleString() : '—'}
            </span>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setShowTopupModal(true)}
            >
              Пополнить
            </Button>
          </>
        )}
      </div>

      <TopupModal
        open={showTopupModal}
        onOpenChange={setShowTopupModal}
        onSuccess={handleTopupSuccess}
      />
    </>
  )
}
