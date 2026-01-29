"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCurrentUserBalance } from "@/actions/balance"

interface BalanceWidgetProps {
    balance?: number
    currency?: string
    lowBalanceThreshold?: number
    compactMode?: boolean
}

export function BalanceWidget({
    balance: initialBalance,
    currency = "PU",
    lowBalanceThreshold = 50,
    compactMode = false,
}: BalanceWidgetProps) {
    const t = useTranslations('Billing');
    const [balance, setBalance] = useState<number | null>(initialBalance ?? null)
    const [loading, setLoading] = useState(initialBalance === undefined)

    useEffect(() => {
        if (initialBalance !== undefined) {
            setBalance(initialBalance)
            return
        }

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

        loadBalance()

        // Refresh balance every 30 seconds
        const interval = setInterval(loadBalance, 30000)
        return () => clearInterval(interval)
    }, [initialBalance])

    const currentBalance = balance ?? 0
    const isLowBalance = currentBalance < lowBalanceThreshold
    const runwayDays = Math.floor(currentBalance / 10) // ~10 PU per day average usage

    if (compactMode) {
        return (
            <Link href="/billing">
                <div
                    className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted",
                        isLowBalance && "border-destructive/50 bg-destructive/5"
                    )}
                >
                    <div className="flex items-center gap-2">
                        {isLowBalance && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <div>
                            <p className="text-xs text-muted-foreground">{t('currentBalance')}</p>
                            <p
                                className={cn(
                                    "text-sm font-semibold tabular-nums",
                                    isLowBalance && "text-destructive"
                                )}
                            >
                                {loading ? '—' : currentBalance.toLocaleString()} {currency}
                            </p>
                        </div>
                    </div>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </div>
            </Link>
        )
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('currentBalance')}</p>
                            <p
                                className={cn(
                                    "text-2xl font-bold tabular-nums",
                                    isLowBalance && "text-destructive"
                                )}
                            >
                                {loading ? '—' : currentBalance.toLocaleString()} {currency}
                            </p>
                        </div>
                        {isLowBalance && (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                    </div>

                    {isLowBalance ? (
                        <div className="rounded-md bg-destructive/10 p-3">
                            <p className="text-xs font-medium text-destructive">
                                {t('lowBalanceWarning')}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('estimatedRunway')}: ~{runwayDays} {t('days')}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {t('estimatedRunway')}: ~{runwayDays} {t('days')}
                        </p>
                    )}

                    <Link href="/billing" className="block">
                        <Button className="w-full" size="sm">
                            <CreditCard className="mr-2 h-4 w-4" />
                            {t('topUpBalance')}
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
