"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Sparkles } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { TrafficSourceData } from "@/lib/data/types"

// Channel colors
const COLORS: Record<string, string> = {
    telegram: "#0088cc",
    whatsapp: "#25D366",
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
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] z-10 transition-all duration-500">
                    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 ring-1 ring-black/5 mx-6">
                        <div className="p-3 rounded-full bg-linear-to-br from-violet-50 to-fuchsia-50 border border-violet-100/50 shadow-inner">
                            <Sparkles className="h-5 w-5 text-violet-500" />
                        </div>
                        <div className="text-center space-y-1.5">
                            <h4 className="text-sm font-bold text-zinc-900 tracking-tight">Скоро доступно</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">
                                Мы работаем над продвинутой аналитикой источников трафика
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
