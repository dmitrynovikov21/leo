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
    collapsed?: boolean
}

export function BalanceWidget({
    balance: initialBalance,
    currency = "PU",
    lowBalanceThreshold = 50,
    compactMode = false,
    collapsed = false,
}: BalanceWidgetProps) {
    const t = useTranslations('Billing');
    const [balance, setBalance] = useState<number | null>(initialBalance ?? null)
    // ... logic stays same ...

    // Moved loadBalance logic inside to match existing file structure which is hidden in this replace block? 
    // Wait, I need to be careful not to delete logic. 
    // I should only replace the interface and the early return for compactMode, or wrap the whole component if I'm confident.
    // But I will try to target specific blocks. 

    // Actually, I can simply add the collapsed check BEFORE compactMode check.

    // Let's rely on the previous context. I will fetch the whole file content in my mind.

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

    if (collapsed) {
        return (
            <Link href="/dashboard/billing" className="w-full flex justify-center">
                <div
                    className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted relative",
                        isLowBalance && "border-destructive/50 bg-destructive/5 text-destructive"
                    )}
                    title={`${t('currentBalance')}: ${loading ? '...' : currentBalance.toLocaleString()} ${currency}`}
                >
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    {isLowBalance && (
                        <div className="absolute -top-1 -right-1">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                            </span>
                        </div>
                    )}
                </div>
            </Link>
        )
    }

    if (compactMode) {
        return (
            <Link href="/dashboard/billing">
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
                            {!loading && currentBalance > 0 && (
                                <p className="text-[10px] text-muted-foreground/70">
                                    хватит на ~{runwayDays} дн.
                                </p>
                            )}
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

                    <Link href="/dashboard/billing" className="block">
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
