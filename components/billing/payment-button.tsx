'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { cancelSubscription } from '@/actions/subscription-manager'

interface PaymentButtonProps {
    planId: string
    planCode?: string
    amount: number
    planName: string
    isCurrent: boolean
    isDowngrade?: boolean
    isUpgrade?: boolean
    accessUntil?: string
    currentPlanCanceled?: boolean
    subscriptionCanceled?: boolean // true when ANY plan is canceled (for all buttons)
    className?: string
}

export function PaymentButton({
    planId,
    planCode,
    amount,
    planName,
    isCurrent,
    isDowngrade,
    isUpgrade,
    accessUntil,
    currentPlanCanceled,
    subscriptionCanceled,
    className,
}: PaymentButtonProps) {
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const router = useRouter()

    const isFree = planCode === 'FREE' || amount === 0

    // When subscription is canceled and this is the FREE plan — block, transition is pending
    const isPendingTransition = subscriptionCanceled && isFree && !isCurrent

    const handleClick = async () => {
        if (isCurrent && !currentPlanCanceled) return
        if (isPendingTransition) return

        // Downgrade (to any lower plan or FREE) — show confirmation
        if (isDowngrade && !subscriptionCanceled) {
            setConfirmOpen(true)
            return
        }

        // Upgrade or re-subscribe — go to payment
        setLoading(true)
        try {
            const response = await fetch('/api/tochka/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    redirectUrl: window.location.href,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Payment initialization failed')
            }

            const data = await response.json()
            if (data.paymentLink) {
                window.location.href = data.paymentLink
            } else {
                throw new Error('No payment URL received')
            }
        } catch (error: any) {
            console.error('Payment error:', error)
            toast.error('Ошибка инициализации оплаты', { description: error.message })
            setLoading(false)
        }
    }

    const handleConfirmDowngrade = async () => {
        setLoading(true)
        try {
            const result = await cancelSubscription()
            toast.success('Подписка отменена', {
                description: `Доступ к текущему плану сохранится до ${new Date(result.accessUntil).toLocaleDateString('ru-RU')}`,
            })
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || 'Ошибка отмены подписки')
        } finally {
            setLoading(false)
            setConfirmOpen(false)
        }
    }

    // Label logic
    let label = 'Перейти'
    if (isPendingTransition) {
        label = `Переход после ${accessUntil || '...'}`
    } else if (isCurrent && currentPlanCanceled) {
        label = `Возобновить ₽${amount.toLocaleString('ru-RU')}`
    } else if (isCurrent) {
        label = 'Текущий план'
    } else if (isDowngrade && isFree) {
        label = 'Перейти на бесплатный'
    } else if (isDowngrade) {
        label = 'Понизить'
    } else if (isUpgrade) {
        label = `Оплатить ₽${amount.toLocaleString('ru-RU')}`
    }

    const downgradeTitle = isFree
        ? 'Перейти на бесплатный план?'
        : `Перейти на план ${planName}?`

    return (
        <>
            <Button
                variant={isCurrent ? 'secondary' : isUpgrade ? 'default' : 'outline'}
                className={cn(
                    className,
                    isCurrent && !currentPlanCanceled
                        ? 'bg-white text-zinc-900 hover:bg-white border-transparent cursor-default disabled:opacity-100'
                        : isPendingTransition
                        ? 'disabled:opacity-100'
                        : isUpgrade
                        ? ''
                        : 'border-border hover:bg-muted/50 text-foreground'
                )}
                onClick={handleClick}
                disabled={loading || (isCurrent && !currentPlanCanceled) || isPendingTransition}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Загрузка...
                    </>
                ) : (
                    label
                )}
            </Button>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{downgradeTitle}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>Вы действительно хотите отменить текущую подписку?</p>
                            {accessUntil && (
                                <p className="font-medium text-foreground">
                                    Вы сможете пользоваться текущим планом до{' '}
                                    <span className="font-bold">{accessUntil}</span>.
                                    После этой даты произойдёт переход на бесплатный тариф.
                                </p>
                            )}
                            {!isFree && (
                                <p className="text-sm">
                                    После окончания текущего периода вы сможете оформить подписку на {planName}.
                                </p>
                            )}
                            {isFree && (
                                <p className="text-sm">
                                    На бесплатном плане будут ограничены лимиты PU, количество документов и диалогов.
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Остаться на текущем</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDowngrade}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Отменить подписку
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
