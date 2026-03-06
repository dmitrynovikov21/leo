'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardCharts } from '@/actions/admin-dashboard'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    color: 'hsl(var(--foreground))',
  },
  labelStyle: { color: 'hsl(var(--foreground))' },
  itemStyle: { color: 'hsl(var(--foreground))' },
}

const gridStroke = 'hsl(var(--border))'
const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 }

interface Props {
  charts: DashboardCharts
}

export function DashboardChartsSection({ charts }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Сообщения по часам (24ч)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.messagesByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="hour" tickFormatter={h => `${h}:00`} tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} />
              <Tooltip {...tooltipStyle} cursor={false} />
              <Bar dataKey="count" fill="#6366f1" name="Сообщения" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Сообщения по дням (30д)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.messagesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} />
              <Tooltip {...tooltipStyle} cursor={false} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Сообщения" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Токены по дням (30д)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.tokensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} />
              <Tooltip {...tooltipStyle} cursor={false} />
              <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
              <Line type="monotone" dataKey="prompt" stroke="#6366f1" strokeWidth={2} name="Промпт" />
              <Line type="monotone" dataKey="completion" stroke="#22c55e" strokeWidth={2} name="Ответ" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Расходы USD по дням (30д)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.tokensByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={axisTickStyle} />
              <YAxis tickFormatter={v => `$${v.toFixed(4)}`} tick={axisTickStyle} />
              <Tooltip {...tooltipStyle} cursor={false} formatter={(v: number) => `$${v.toFixed(6)}`} />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Расходы" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Топ-5 агентов по диалогам</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.topAgents} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tick={axisTickStyle} />
              <YAxis dataKey="name" type="category" width={80} tick={axisTickStyle} />
              <Tooltip {...tooltipStyle} cursor={false} />
              <Bar dataKey="count" fill="#6366f1" name="Диалоги" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Распределение по моделям</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={charts.modelDistribution}
                dataKey="count"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ model, percent }) => `${model.split('-').slice(-1)[0]} ${(percent * 100).toFixed(0)}%`}
              >
                {charts.modelDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} cursor={false} formatter={(v: number) => v.toLocaleString('ru-RU')} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
