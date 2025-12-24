"use client"

import { useTranslations } from "next-intl"
import { MessageSquare, Wallet, Zap, TrendingUp } from "lucide-react"

import { useUser } from "@/components/providers/user-data-provider"
import { KPICard, mockSparklineData } from "./kpi-card"
import { DialogVolumeChart } from "./dialog-volume-chart"
import { TrafficSourceChart } from "./traffic-source-chart"
import { ActiveChannels } from "./active-channels"
import { SystemEventsLog } from "./system-events-log"

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
    const { isLoading } = useUser()

    // Use mock data for now
    const dashboardData = mockDashboardData

    const getKpi = (id: string) => dashboardData.kpis.find(k => k.id === id)

    // Icon map
    const iconMap: Record<string, any> = {
        'message-square': MessageSquare,
        'trending-up': TrendingUp,
        'zap': Zap,
        'wallet': Wallet
    }

    if (isLoading) {
        return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-zinc-100 animate-pulse rounded-2xl" />)}
        </div>
    }

    const kpi1 = getKpi('total-dialogs')
    const kpi2 = getKpi('total-messages')
    const kpi3 = getKpi('automation-rate')
    const kpi4 = getKpi('cost-efficiency')

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Top Row: KPI Cards - 4 compact cards */}
            <div className="md:col-span-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Dialogs */}
                    {kpi1 && <KPICard
                        title={t('totalDialogs')}
                        value={kpi1.value}
                        trend={{ value: kpi1.change, isPositive: kpi1.trend === 'up' }}
                        icon={iconMap[kpi1.icon] || MessageSquare}
                        sparklineData={mockSparklineData}
                    />}

                    {/* Card 2: Total Messages */}
                    {kpi2 && <KPICard
                        title={t('totalMessages')}
                        value={kpi2.value}
                        trend={{ value: kpi2.change, isPositive: kpi2.trend === 'up' }}
                        icon={iconMap[kpi2.icon] || TrendingUp}
                    />}

                    {/* Card 3: Automation Rate */}
                    {kpi3 && <KPICard
                        title={t('automationRate')}
                        value={kpi3.value}
                        trend={{ value: kpi3.change, isPositive: kpi3.trend === 'up' }}
                        secondaryInfo={t('dialogsWithoutHuman')}
                        icon={iconMap[kpi3.icon] || Zap}
                    />}

                    {/* Card 4: Cost Efficiency */}
                    {kpi4 && <KPICard
                        title={t('costEfficiency')}
                        value={kpi4.value}
                        secondaryInfo={`${t('saved')}: ~₽4.2k`}
                        icon={iconMap[kpi4.icon] || Wallet}
                    />}
                </div>
            </div>

            {/* Middle Row: Analytics Charts */}
            {/* Left: Traffic Dynamics (8 cols) */}
            <div className="md:col-span-8">
                <DialogVolumeChart data={dashboardData.charts.volume} />
            </div>

            {/* Right: Traffic Source (4 cols) */}
            <div className="md:col-span-4">
                <TrafficSourceChart data={dashboardData.charts.trafficSources} />
            </div>

            {/* Bottom Row: Channels & Events */}
            {/* Left: Active Channels (8 cols) */}
            <div className="md:col-span-8">
                <ActiveChannels channels={dashboardData.activeChannels} />
            </div>

            {/* Right: System Events Log (4 cols) */}
            <div className="md:col-span-4">
                <SystemEventsLog events={dashboardData.systemEvents} />
            </div>
        </div>
    )
}
