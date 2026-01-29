'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getActiveTokenRate } from '@/actions/token-rates'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function TopupForm({ onSuccess, onOpenChange }: { onSuccess: () => void; onOpenChange: (open: boolean) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [amount, setAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    loadRate()
  }, [])

  const loadRate = async () => {
    try {
      const activeRate = await getActiveTokenRate()
      if (activeRate) {
        setRate(activeRate.rubToTokenRate)
      }
    } catch (error) {
      console.error('Error loading rate:', error)
    }
  }

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      toast.error('Payment system not ready')
      return
    }

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      // Create payment intent
      const response = await fetch('/api/stripe/create-topup-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum }),
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const { clientSecret, tokensToAdd } = await response.json()

      // Get card element
      const cardElement = elements.getElement(CardElement)

      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (result.error) {
        toast.error(result.error.message || 'Payment failed')
      } else if (result.paymentIntent?.status === 'succeeded') {
        toast.success(`Payment successful! You received ${tokensToAdd} tokens`)
        setAmount('100')
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error(error instanceof Error ? error.message : 'Payment processing failed')
    } finally {
      setLoading(false)
    }
  }

  const tokensToReceive = rate ? (parseFloat(amount) * rate).toFixed(0) : '—'

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='amount'>Amount (RUB)</Label>
        <Input
          id='amount'
          type='number'
          min='1'
          step='1'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          placeholder='Enter amount'
        />
        <p className='text-sm text-gray-600'>
          You will receive approximately {tokensToReceive} tokens at current rate (1₽ = {rate?.toFixed(2) || '—'} tokens)
        </p>
      </div>

      <div className='space-y-2'>
        <Label>Quick amounts</Label>
        <div className='flex flex-wrap gap-2'>
          {[100, 500, 1000, 5000].map((value) => (
            <Button
              key={value}
              type='button'
              variant='outline'
              size='sm'
              onClick={() => handleQuickAmount(value)}
              disabled={loading}
            >
              {value}₽
            </Button>
          ))}
        </div>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='card'>Card Details</Label>
        <div className='rounded-lg border border-gray-200 bg-white p-3'>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
            disabled={loading}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
          Cancel
        </Button>
        <Button type='submit' disabled={loading || !stripe || !elements}>
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Processing...
            </>
          ) : (
            `Pay ${amount}₽`
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function TopupModal({ open, onOpenChange, onSuccess }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top-up Token Balance</DialogTitle>
          <DialogDescription>
            Add tokens to your account using a payment card
          </DialogDescription>
        </DialogHeader>

        <Elements stripe={stripePromise}>
          <TopupForm onSuccess={onSuccess} onOpenChange={onOpenChange} />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}
