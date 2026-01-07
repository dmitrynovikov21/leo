"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MessageSquare, Wallet, Zap, TrendingUp } from "lucide-react"

import { useUser } from "@/components/providers/user-data-provider"
import { KPICard, mockSparklineData } from "./kpi-card"
import { DialogVolumeChart } from "./dialog-volume-chart"
import { TrafficSourceChart } from "./traffic-source-chart"


// Mock data for dashboard (until real API is integrated)
const mockDashboardData = {
    kpis: [
        { id: 'total-dialogs', value: '1,234', change: 12, trend: 'up', icon: 'message-square' },
        { id: 'total-messages', value: '45.2k', change: 8, trend: 'up', icon: 'trending-up' },
        { id: 'automation-rate', value: '87%', change: 5, trend: 'up', icon: 'zap' },
        { id: 'cost-efficiency', value: '₽2.4', change: -3, trend: 'down', icon: 'wallet' },
    ],
    charts: {
        volume: {
            '24h': [
                { time: '00:00', count: 45 },
                { time: '04:00', count: 32 },
                { time: '08:00', count: 78 },
                { time: '12:00', count: 120 },
                { time: '16:00', count: 95 },
                { time: '20:00', count: 68 },
            ],
            '7d': [
                { day: 'Пн', count: 120 },
                { day: 'Вт', count: 150 },
                { day: 'Ср', count: 180 },
                { day: 'Чт', count: 140 },
                { day: 'Пт', count: 200 },
                { day: 'Сб', count: 90 },
                { day: 'Вс', count: 70 },
            ],
            '30d': [
                { week: 'Неделя 1', count: 850 },
                { week: 'Неделя 2', count: 920 },
                { week: 'Неделя 3', count: 780 },
                { week: 'Неделя 4', count: 1100 },
            ]
        },
        trafficSources: [
            { name: 'Telegram', value: 65 },
            { name: 'WhatsApp', value: 20 },
            { name: 'Web', value: 15 },
        ]
    },
    activeChannels: [
        { id: '1', name: 'Telegram Bot', type: 'telegram' as const, status: 'connected' as const, lastActivity: '5 мин назад' },
        { id: '2', name: 'WhatsApp', type: 'whatsapp' as const, status: 'connected' as const, lastActivity: '10 мин назад' },
    ],
    systemEvents: [
        { id: '1', type: 'success' as const, text: 'Система работает стабильно', time: 'Только что' },
    ]
}

export function OverviewDashboard() {
    const t = useTranslations('Dashboard')
    const { isLoading: isUserLoading } = useUser()

    const [overview, setOverview] = React.useState({
        totalDialogs: 0,
        totalMessages: 0,
        totalUsers: 0,
        totalTokens: 0
    })

    const [history, setHistory] = React.useState<any>({
        '24h': [],
        '7d': [],
        '30d': []
    })

    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Fetch Overview
                const resOverview = await fetch('/api/v1/agents/stats/overview')
                if (resOverview.ok) {
                    const data = await resOverview.json()
                    setOverview(data)
                }

                // 2. Fetch History
                const resHistory = await fetch('/api/v1/agents/stats/history')
                if (resHistory.ok) {
                    const data = await resHistory.json()

                    // Transform for Chart
                    // 24h: { time: 'HH:mm', count: number }
                    const last24h = data.last24h.map((item: any) => ({
                        time: new Date(item.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                        count: item.dialogs // "Dialog Volume"
                    }))

                    // 7d: { day: 'Weekday', count: number }
                    const last7d = data.last7d.map((item: any) => ({
                        day: new Date(item.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
                        count: item.dialogs
                    }))

                    // 30d: { week: 'Date', count: number } (Chart expects 'week' key)
                    const last30d = data.last30d.map((item: any) => ({
                        week: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
                        count: item.dialogs
                    }))

                    setHistory({
                        '24h': last24h,
                        '7d': last7d,
                        '30d': last30d
                    })
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchStats()
    }, [])

    // Icon map
    const iconMap: Record<string, any> = {
        'message-square': MessageSquare,
        'trending-up': TrendingUp,
        'zap': Zap,
        'wallet': Wallet
    }

    if (isUserLoading || isLoading) {
        return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-zinc-100 animate-pulse rounded-2xl" />)}
        </div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Top Row: KPI Cards - 4 compact cards */}
            <div className="md:col-span-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Dialogs */}
                    <KPICard
                        title={t('totalDialogs')}
                        value={overview.totalDialogs.toLocaleString()}
                        // Trend removed as we don't calculate it dynamically yet
                        // trend={{ value: 12, isPositive: true }} 
                        icon={MessageSquare}
                        sparklineData={mockSparklineData}
                    />

                    {/* Card 2: Total Messages */}
                    <KPICard
                        title={t('totalMessages')}
                        value={overview.totalMessages.toLocaleString()}
                        // trend={{ value: 8, isPositive: true }}
                        icon={TrendingUp}
                    />

                    {/* Card 3: Total Users (was Automation Rate) */}
                    <KPICard
                        title={t('automationRate')} // Keeping translation key but showing users
                        value={overview.totalUsers.toLocaleString()}
                        // trend={{ value: 5, isPositive: true }}
                        // secondaryInfo={t('dialogsWithoutHuman')} // Hidden as per request
                        icon={Zap}
                    />

                    {/* Card 4: Total Tokens (was Cost Efficiency) */}
                    <KPICard
                        title={t('costEfficiency')} // Keeping translation key but showing tokens
                        value={overview.totalTokens.toLocaleString()}
                        // secondaryInfo={`${t('saved')}: ~₽${(overview.totalTokens * 0.002).toFixed(2)}`} // Hidden as per request
                        icon={Wallet}
                    />
                </div>
            </div>

            {/* Middle Row: Analytics Charts */}
            {/* Left: Traffic Dynamics (8 cols) */}
            <div className="md:col-span-8">
                <DialogVolumeChart data={history} />
            </div>

            {/* Right: Traffic Source (4 cols) */}
            <div className="md:col-span-4">
                <TrafficSourceChart data={[
                    { name: 'Telegram', value: 100 }, // Hardcoded for now as we only have Telegram
                    { name: 'WhatsApp', value: 0 },
                    { name: 'Web', value: 0 },
                ]} />
            </div>

        </div>
    )
}
