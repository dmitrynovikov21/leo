"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MessageSquare, Wallet, Clock, Star, TrendingUp, TrendingDown } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface KPICardProps {
    title: string
    value: string | number
    trend?: {
        value: number
        isPositive: boolean
    }
    secondaryInfo?: string
    icon: React.ComponentType<{ className?: string }>
    sparklineData?: number[]
}

export function KPICard({ title, value, trend, secondaryInfo, icon: Icon, sparklineData }: KPICardProps) {
    return (
        <Card className="relative overflow-hidden bg-card border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-1">
                    <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
                    {trend && (
                        <div className="flex items-center gap-1 text-xs">
                            {trend.isPositive ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span className={`font-medium tabular-nums ${trend.isPositive ? "text-emerald-500" : "text-red-500"}`}>
                                {trend.isPositive ? "+" : ""}{trend.value}%
                            </span>
                            <span className="text-muted-foreground ml-1">от прошлого месяца</span>
                        </div>
                    )}
                    {secondaryInfo && (
                        <p className="text-xs text-muted-foreground mt-2">
                            {secondaryInfo}
                        </p>
                    )}
                </div>

                {/* Sparkline background */}
                {sparklineData && (
                    <div className="absolute bottom-0 right-0 w-32 h-16 opacity-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sparklineData.map((value, i) => ({ value }))}>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#18181b"
                                    fill="#18181b"
                                    strokeWidth={1}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Export mock sparkline data
export const mockSparklineData = [120, 132, 101, 134, 190, 230, 210]
