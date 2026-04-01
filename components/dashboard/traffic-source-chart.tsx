"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Send } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TrafficSourceChartProps {
    telegramDialogs?: number
}

export function TrafficSourceChart({ telegramDialogs = 0 }: TrafficSourceChartProps) {
    const t = useTranslations('Dashboard')

    return (
        <Card className="bg-muted/30 border border-border shadow-none rounded-2xl h-full">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">
                    {t('trafficSource')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center gap-6 py-8">
                    {/* Telegram circle */}
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
                            <div className="h-20 w-20 rounded-full bg-[#0088cc]/20 flex items-center justify-center">
                                <Send className="h-8 w-8 text-[#0088cc]" />
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-card border border-border rounded-full px-2 py-0.5">
                            <span className="text-xs font-bold text-foreground">100%</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="text-center space-y-1">
                        <h3 className="text-sm font-semibold text-foreground">Telegram</h3>
                        <p className="text-2xl font-bold tabular-nums text-foreground">{telegramDialogs.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">диалогов</p>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-[#0088cc]" />
                        <span>Единственный активный канал</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
