"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, MessageSquare, Clock, ThumbsUp, Wallet, Activity, FileText, Zap, DollarSign, UserPlus, Lock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Mock data removed in favor of real data


export function AnalyticsDashboard({ agentId }: { agentId?: string }) {
    const t = useTranslations('Agents.detail');
    const [stats, setStats] = React.useState({
        totalDialogs: 0,
        todayDialogs: 0,
        totalTokens: 0,
        avgResponseTimeMs: 0
    });
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!agentId) return;

        const controller = new AbortController();

        const fetchStats = async () => {
            try {
                // Fetch overview stats
                const res = await fetch(`/api/agents/${agentId}/stats`, { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }

                // Fetch daily stats for chart (last 7 days)
                const toDate = new Date();
                const fromDate = new Date();
                fromDate.setDate(toDate.getDate() - 7);

                const toStr = toDate.toISOString();
                const fromStr = fromDate.toISOString();

                const resPeriod = await fetch(`/api/agents/${agentId}/stats/period?from=${fromStr}&to=${toStr}`, { signal: controller.signal });
                if (resPeriod.ok) {
                    const periodData = await resPeriod.json();
                    // Transform for recharts
                    const formattedChartData = periodData.map((item: any) => ({
                        name: new Date(item.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
                        dialogs: item.dialogs,
                        tokens: item.tokens
                    }));
                    setChartData(formattedChartData);
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Failed to fetch stats:", error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchStats();

        return () => {
            controller.abort();
        };
    }, [agentId]);

    return (
        <Tabs defaultValue="overview" className="flex-1 space-y-6">
            {/* Header: Title + Controls */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('operationsCenter')}</h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center h-8 px-3 rounded-xl text-muted-foreground/60 gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Отчеты — скоро</span>
                    </span>
                </div>
            </div>

            <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Всего диалогов
                            </CardTitle>
                            <div className="h-8 w-8 flex items-center justify-center">
                                <span className="text-xl">🤖</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? "-" : stats.totalDialogs.toLocaleString()}
                            </div>

                        </CardContent>
                    </Card>
                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Диалоги сегодня
                            </CardTitle>
                            <div className="h-8 w-8 flex items-center justify-center">
                                <span className="text-xl">💬</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? "-" : stats.todayDialogs.toLocaleString()}
                            </div>

                        </CardContent>
                    </Card>
                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                Всего токенов
                            </CardTitle>
                            <div className="h-8 w-8 flex items-center justify-center">
                                <span className="text-xl">🎟️</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? "-" : stats.totalTokens.toLocaleString()}
                            </div>

                        </CardContent>
                    </Card>
                    <Card className="border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold text-foreground">
                                {t('avgResponseTime')}
                            </CardTitle>
                            <div className="h-8 w-8 flex items-center justify-center">
                                <span className="text-xl">⚡</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? "-" : (stats.avgResponseTimeMs / 1000).toFixed(1)}s
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* CHARTS ROW */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-7 border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-card rounded-2xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-foreground">Обзор активности</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">
                                Объем потраченных токенов за последние 7 дней
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pl-0 pr-2 pt-6">
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#a1a1aa"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#a1a1aa"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `${value}`}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                            itemStyle={{ color: '#18181b', fontWeight: 600 }}
                                            cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                                        />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                                        <Area type="monotone" dataKey="tokens" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTokens)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* RECENT ACTIVITY / ALERTS */}

                </div>
            </TabsContent>
        </Tabs>
    )
}
