"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { TrafficSourceData } from "@/lib/data/types"

// Channel colors
const COLORS: Record<string, string> = {
    whatsapp: "#25D366",
    telegram: "#0088cc",
    web: "#6366f1",
    // Fallback colors for other sources
    other: "#a1a1aa"
}

const getColor = (name: string) => {
    const key = name.toLowerCase().includes('whatsapp') ? 'whatsapp' :
        name.toLowerCase().includes('telegram') ? 'telegram' :
            name.toLowerCase().includes('web') ? 'web' : 'other'
    return COLORS[key]
}

interface TrafficSourceChartProps {
    data?: TrafficSourceData[]
}

export function TrafficSourceChart({ data = [] }: TrafficSourceChartProps) {
    const t = useTranslations('Dashboard')

    // Add color to data
    const chartData = data.map(item => ({
        ...item,
        color: getColor(item.name)
    }))

    return (
        <Card className="bg-zinc-50/50 border border-zinc-200/50 shadow-none rounded-2xl h-full relative overflow-hidden">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-zinc-900">
                    {t('trafficSource')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] relative blur-[1px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="45%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                formatter={(value: number) => `${value}%`}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry: any) => (
                                    <span className="text-sm text-zinc-600">
                                        {value}: <span className="font-mono tabular-nums font-semibold">{entry.payload.value}%</span>
                                    </span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Overlay Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <Badge variant="secondary" className="text-sm font-medium px-4 py-1.5 bg-white/90 backdrop-blur-sm border-zinc-200 shadow-sm text-zinc-900 ring-1 ring-zinc-200">
                        Скоро
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
