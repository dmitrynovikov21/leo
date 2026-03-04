'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PaymentButtonProps {
    planId: string
    amount: number
    planName: string
    isCurrent: boolean
    className?: string
}

export function PaymentButton({ planId, amount, planName, isCurrent, className }: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handlePayment = async () => {
        if (isCurrent) return

        setLoading(true)
        try {
            const response = await fetch('/api/ypmn/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount, // Amount in RUB
                    type: 'SUB',
                    planId: planId,
                    redirectUrl: window.location.href, // Return to billing page
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Payment initialization failed')
            }

            const data = await response.json()

            if (data.paymentUrl) {
                window.location.href = data.paymentUrl
            } else {
                throw new Error('No payment URL received')
            }

        } catch (error: any) {
            console.error('Payment error:', error)
            toast.error('Ошибка инициализации оплаты', {
                description: error.message
            })
            setLoading(false)
        }
    }

    return (
        <Button
            variant={isCurrent ? "secondary" : "outline"}
            className={cn(className, isCurrent ? "bg-card text-foreground hover:bg-muted" : "border-border hover:bg-muted/50 text-foreground")}
            onClick={handlePayment}
            disabled={loading || isCurrent}
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                </>
            ) : isCurrent ? (
                "Текущий план"
            ) : (
                "Перейти"
            )}
        </Button>
    )
}
