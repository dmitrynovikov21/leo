"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { DialogVolumeData } from "@/lib/data/types"

interface DialogVolumeChartProps {
    className?: string
    data?: DialogVolumeData
}

export function DialogVolumeChart({ className, data }: DialogVolumeChartProps) {
    const t = useTranslations('Dashboard')
    const [timeframe, setTimeframe] = React.useState<"24h" | "7d" | "30d">("7d")

    const chartData = data ? data[timeframe] : []
    const xAxisKey = timeframe === "24h" ? "time" : timeframe === "7d" ? "day" : "week"

    return (
        <Card className={cn(className, "bg-white border border-zinc-200/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl")}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-zinc-900">{t('dialogVolume')}</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Динамика объема сообщений
                        </CardDescription>
                    </div>
                    <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
                        <TabsList className="bg-zinc-100/50">
                            <TabsTrigger value="24h" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">24ч</TabsTrigger>
                            <TabsTrigger value="7d" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">7д</TabsTrigger>
                            <TabsTrigger value="30d" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">30д</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="hsl(var(--border))"
                            />
                            <XAxis
                                dataKey={xAxisKey}
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorCount)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
