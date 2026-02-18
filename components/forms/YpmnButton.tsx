"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface YpmnButtonProps {
    amount: number
    label?: string
    className?: string
    planId?: string
}

export function YpmnButton({ amount, label = "Pay with Card", className, planId }: YpmnButtonProps) {
    const [loading, setLoading] = useState(false)

    const handlePay = async () => {
        setLoading(true)
        const toastId = toast.loading('Initializing payment...')

        try {
            const res = await fetch('/api/ypmn/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    type: planId ? 'SUB' : 'PACK',
                    planId
                })
            })

            if (!res.ok) {
                const errorData = await res.text()
                throw new Error(errorData || 'Payment initialization failed')
            }

            const data = await res.json()

            if (data.paymentUrl) {
                toast.success('Redirecting to payment gateway...', { id: toastId })
                window.location.href = data.paymentUrl
            } else {
                console.error('No payment URL in response:', data)
                throw new Error('No payment URL received')
            }
        } catch (error) {
            console.error('Payment Error:', error)
            toast.error('Failed to start payment. Please try again.', { id: toastId })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handlePay} disabled={loading} className={className}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {label}
        </Button>
    )
}
