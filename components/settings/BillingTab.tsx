"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Check, Zap, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cancelSubscription } from "@/actions/subscription-manager"

interface SubData {
    planName: string
    planCode: string
    priceRub: number
    nextResetDate: string
    status: string
    features: string[]
}

export function BillingTab() {
    const router = useRouter()
    const [isLoading, setIsLoading] = React.useState(true)
    const [sub, setSub] = React.useState<SubData | null>(null)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const [isCanceling, setIsCanceling] = React.useState(false)

    React.useEffect(() => {
        fetch('/api/user/subscription')
            .then(res => res.json())
            .then(data => setSub(data))
            .catch(() => {})
            .finally(() => setIsLoading(false))
    }, [])

    const isFree = sub?.planCode === 'FREE'
    const isCanceled = sub?.status === 'CANCELED'

    const nextResetFormatted = sub?.nextResetDate
        ? new Date(sub.nextResetDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—'

    const handleCancel = async () => {
        setIsCanceling(true)
        try {
            const result = await cancelSubscription()
            toast.success('Подписка отменена', {
                description: `Доступ сохранится до ${new Date(result.accessUntil).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            })
            router.refresh()
            // Update local state
            setSub(prev => prev ? { ...prev, status: 'CANCELED' } : prev)
        } catch (error: any) {
            toast.error(error.message || 'Ошибка отмены подписки')
        } finally {
            setIsCanceling(false)
            setConfirmOpen(false)
        }
    }

    if (isLoading) {
        return <Skeleton className="h-[300px] w-full rounded-2xl" />
    }

    return (
        <div className="space-y-6">
            <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground">Тарифный план</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        {isCanceled
                            ? <>Подписка отменена. Доступ к плану <span className="font-semibold text-foreground">{sub?.planName}</span> сохранится до <span className="font-semibold text-foreground">{nextResetFormatted}</span>.</>
                            : <>Вы используете план <span className="font-semibold text-foreground">{sub?.planName || 'Free'}</span>.</>
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between border border-border p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                                <Zap className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                                <div className="font-bold text-lg text-foreground">{sub?.planName || 'Free'}</div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {isFree ? 'Бесплатный' : `₽${sub?.priceRub?.toLocaleString('ru-RU')} / мес`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isCanceled && (
                                <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 rounded-lg">
                                    Отменён
                                </Badge>
                            )}
                            <Button
                                variant="outline"
                                className="rounded-xl border-border hover:bg-muted shadow-sm font-medium text-foreground"
                                onClick={() => router.push('/dashboard/billing')}
                            >
                                Изменить план
                            </Button>
                        </div>
                    </div>

                    {sub?.features && sub.features.length > 0 && (
                        <div className="space-y-3">
                            <div className="text-sm font-semibold text-foreground">Доступные возможности</div>
                            <ul className="grid gap-2.5 text-sm text-muted-foreground font-medium">
                                {sub.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center shrink-0">
                                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
                {!isFree && (
                    <CardFooter className="flex justify-between border-t border-border pt-6 pb-6 px-6">
                        <div className="text-sm text-muted-foreground font-medium">
                            {isCanceled
                                ? <>Доступ до: <span className="font-semibold text-foreground">{nextResetFormatted}</span></>
                                : <>Следующее списание: <span className="font-semibold text-foreground">{nextResetFormatted}</span></>
                            }
                        </div>
                        {!isCanceled && (
                            <Button
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-medium"
                                onClick={() => setConfirmOpen(true)}
                            >
                                Отменить подписку
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Отменить подписку?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>Вы действительно хотите отменить подписку?</p>
                            <p className="font-medium text-foreground">
                                Вы сможете пользоваться планом <span className="font-bold">{sub?.planName}</span> до{' '}
                                <span className="font-bold">{nextResetFormatted}</span>.
                                После этой даты произойдёт переход на бесплатный тариф.
                            </p>
                            <p className="text-sm">
                                На бесплатном плане будут ограничены лимиты PU, количество документов и диалогов.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Остаться на текущем</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Отменить подписку
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
