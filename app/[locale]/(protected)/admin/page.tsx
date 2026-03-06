import { redirect } from 'next/navigation'
import { Users, Bot, Zap, DollarSign, Activity, Power } from 'lucide-react'

import { getCurrentUser } from '@/lib/session'
import { getDashboardStats, getDashboardCharts, getActivityFeed } from '@/actions/admin-dashboard'
import { StatCard } from './components/stat-card'
import { DashboardChartsSection } from './components/dashboard-charts'
import { ActivityFeed } from './components/activity-feed'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') redirect('/login')

  const [stats, charts, feed] = await Promise.all([
    getDashboardStats(),
    getDashboardCharts(),
    getActivityFeed(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Общая картина платформы</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Всего пользователей"
          value={stats.totalUsers.toLocaleString('ru-RU')}
          icon={Users}
        />
        <StatCard
          title="Активных сегодня"
          value={stats.activeToday.toLocaleString('ru-RU')}
          sub="отправили ≥1 сообщение"
          icon={Activity}
        />
        <StatCard
          title="Всего агентов"
          value={stats.totalAgents.toLocaleString('ru-RU')}
          icon={Bot}
        />
        <StatCard
          title="Агентов онлайн"
          value={stats.runningAgents.toLocaleString('ru-RU')}
          sub="статус RUNNING"
          icon={Power}
        />
        <StatCard
          title="Потрачено PU сегодня"
          value={stats.puSpentToday.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
          icon={Zap}
        />
        <StatCard
          title="Реальные траты сегодня"
          value={`$${stats.realCostToday.toFixed(4)}`}
          icon={DollarSign}
        />
      </div>

      <DashboardChartsSection charts={charts} />

      <ActivityFeed events={feed} />
    </div>
  )
}
