'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { CreditCard, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PU_PACKS = [
    { id: 'pack_100', puAmount: 100, priceRub: 700, perPu: '7.00' },
    { id: 'pack_250', puAmount: 250, priceRub: 1700, perPu: '6.80' },
    { id: 'pack_500', puAmount: 500, priceRub: 3300, perPu: '6.60' },
    { id: 'pack_1000', puAmount: 1000, priceRub: 6500, perPu: '6.50' },
]

const DEFAULT_AVG_DAILY_PU = 5 // среднее для новых пользователей (~5 диалогов в день)

interface TopupDialogProps {
    avgDailySpend?: number
    puBalance?: number
}

export function TopupDialog({ avgDailySpend = 0, puBalance = 0 }: TopupDialogProps) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState(PU_PACKS[1].id)
    const [loading, setLoading] = useState(false)

    const selectedPack = PU_PACKS.find(p => p.id === selected)!

    const handlePay = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/tochka/create-topup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packId: selected,
                    redirectUrl: window.location.href,
                }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Payment failed')
            }

            const data = await res.json()
            if (data.paymentLink) {
                window.location.href = data.paymentLink
            }
        } catch (err: any) {
            toast.error('Ошибка создания платежа', { description: err.message })
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full shadow-sm rounded-xl font-medium h-10">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Пополнить баланс
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Пополнение баланса</DialogTitle>
                    <DialogDescription>
                        Выберите пакет PU для пополнения
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-3 py-4">
                    {PU_PACKS.map(pack => (
                        <button
                            key={pack.id}
                            onClick={() => setSelected(pack.id)}
                            className={cn(
                                'flex flex-col items-center rounded-xl border-2 p-4 transition-all',
                                selected === pack.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/30'
                            )}
                        >
                            <div className="flex items-center gap-1 text-2xl font-bold text-foreground">
                                <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                                {pack.puAmount}
                            </div>
                            <span className="text-xs text-muted-foreground mt-0.5">PU</span>
                            <div className="mt-2 text-lg font-semibold text-foreground">
                                ₽{pack.priceRub.toLocaleString('ru-RU')}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                ₽{pack.perPu} за 1 PU
                            </span>
                        </button>
                    ))}
                </div>

                <div className="rounded-xl bg-muted p-4 space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">К оплате</span>
                        <span className="font-bold text-foreground">₽{selectedPack.priceRub.toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Вы получите</span>
                        <span className="font-bold text-foreground">{selectedPack.puAmount} PU</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Стоимость за 1 PU</span>
                        <span className="text-muted-foreground">₽{selectedPack.perPu}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-border/50 mt-1">
                        <span className="text-muted-foreground">Хватит на</span>
                        <span className="font-medium text-foreground">
                            ~{(() => {
                                const daily = avgDailySpend > 0 ? avgDailySpend : DEFAULT_AVG_DAILY_PU
                                const days = Math.floor(selectedPack.puAmount / daily)
                                return days > 0 ? `${days} дн.` : '<1 дн.'
                            })()} {avgDailySpend > 0 ? '' : '(оценка)'}
                        </span>
                    </div>
                </div>

                <Button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-semibold"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Перенаправление...
                        </>
                    ) : (
                        <>
                            Оплатить ₽{selectedPack.priceRub.toLocaleString('ru-RU')}
                        </>
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    )
}
