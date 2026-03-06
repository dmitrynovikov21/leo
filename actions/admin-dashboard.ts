'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

function assertAdmin(session: any) {
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
}

export async function getDashboardStats() {
  const session = await auth()
  assertAdmin(session)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [totalUsers, totalAgents, runningAgents, puResult, costResult] = await Promise.all([
    prisma.user.count(),
    prisma.agent.count(),
    prisma.agent.count({ where: { status: 'RUNNING' } }),
    prisma.puTransaction.aggregate({
      where: { type: 'OVERAGE_DEDUCTION', createdAt: { gte: todayStart } },
      _sum: { puAmount: true },
    }),
    prisma.tokenUsage.aggregate({
      where: { isTest: false, createdAt: { gte: todayStart } },
      _sum: { realCostUsd: true },
    }),
  ])

  type ActiveCount = { count: bigint }
  const [activeResult] = await prisma.$queryRaw<ActiveCount[]>`
    SELECT COUNT(DISTINCT a."userId")::bigint as count
    FROM agent_messages am
    JOIN agents a ON a.id = am.agent_id
    WHERE am.created_at >= ${todayStart} AND am.is_test = false
  `

  return {
    totalUsers,
    activeToday: Number(activeResult.count),
    totalAgents,
    runningAgents,
    puSpentToday: Math.abs(Number(puResult._sum.puAmount ?? 0)),
    realCostToday: Number(costResult._sum.realCostUsd ?? 0),
  }
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>

export async function getDashboardCharts() {
  const session = await auth()
  assertAdmin(session)

  const now = new Date()
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [msgByHour, msgByDay, tokensByDay, topAgents, modelDist] = await Promise.all([
    prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*)::bigint as count
      FROM agent_messages
      WHERE created_at >= ${h24ago} AND is_test = false
      GROUP BY hour ORDER BY hour
    `,
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT TO_CHAR(created_at, 'MM-DD') as date, COUNT(*)::bigint as count
      FROM agent_messages
      WHERE created_at >= ${d30ago} AND is_test = false
      GROUP BY date ORDER BY date
    `,
    prisma.$queryRaw<Array<{ date: string; prompt: bigint; completion: bigint; cost: number }>>`
      SELECT
        TO_CHAR(created_at, 'MM-DD') as date,
        SUM(prompt_tokens)::bigint as prompt,
        SUM(completion_tokens)::bigint as completion,
        SUM(real_cost_usd)::float as cost
      FROM token_usage
      WHERE created_at >= ${d30ago} AND is_test = false
      GROUP BY date ORDER BY date
    `,
    prisma.$queryRaw<Array<{ agent_id: string; name: string | null; emoji: string | null; count: bigint }>>`
      SELECT
        am.agent_id,
        a.display_name as name,
        a.avatar_emoji as emoji,
        COUNT(DISTINCT am.telegram_user_id)::bigint as count
      FROM agent_messages am
      JOIN agents a ON a.id = am.agent_id
      WHERE am.is_test = false
      GROUP BY am.agent_id, a.display_name, a.avatar_emoji
      ORDER BY count DESC
      LIMIT 5
    `,
    prisma.$queryRaw<Array<{ model: string; count: bigint }>>`
      SELECT model, COUNT(*)::bigint as count
      FROM token_usage
      WHERE is_test = false
      GROUP BY model
      ORDER BY count DESC
    `,
  ])

  return {
    messagesByHour: msgByHour.map(r => ({ hour: r.hour, count: Number(r.count) })),
    messagesByDay: msgByDay.map(r => ({ date: r.date, count: Number(r.count) })),
    tokensByDay: tokensByDay.map(r => ({
      date: r.date,
      prompt: Number(r.prompt),
      completion: Number(r.completion),
      cost: Number(r.cost ?? 0),
    })),
    topAgents: topAgents.map(r => ({
      agentId: r.agent_id,
      name: r.name || r.agent_id.slice(0, 8),
      emoji: r.emoji || '🤖',
      count: Number(r.count),
    })),
    modelDistribution: modelDist.map(r => ({ model: r.model, count: Number(r.count) })),
  }
}

export type DashboardCharts = Awaited<ReturnType<typeof getDashboardCharts>>

export async function getActivityFeed() {
  const session = await auth()
  assertAdmin(session)

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [newUsers, newAgents, errorAgents, newConflicts] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.agent.findMany({
      where: { createdAt: { gte: since }, status: { not: 'ERROR' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, displayName: true, name: true, avatarEmoji: true, createdAt: true },
    }),
    prisma.agent.findMany({
      where: { updatedAt: { gte: since }, status: 'ERROR' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { id: true, displayName: true, name: true, avatarEmoji: true, updatedAt: true },
    }),
    prisma.knowledgeConflict.findMany({
      where: { detectedAt: { gte: since }, status: 'NEW' },
      orderBy: { detectedAt: 'desc' },
      take: 20,
      select: { id: true, topic: true, detectedAt: true },
    }),
  ])

  type EventType = 'USER_REGISTERED' | 'AGENT_CREATED' | 'AGENT_ERROR' | 'CONFLICT'

  const events = [
    ...newUsers.map(u => ({
      id: u.id,
      type: 'USER_REGISTERED' as EventType,
      description: `Новый пользователь: ${u.email || u.name || u.id.slice(0, 8)}`,
      timestamp: u.createdAt,
    })),
    ...newAgents.map(a => ({
      id: a.id,
      type: 'AGENT_CREATED' as EventType,
      description: `Создан агент: ${a.avatarEmoji || ''} ${a.displayName || a.name}`,
      timestamp: a.createdAt,
    })),
    ...errorAgents.map(a => ({
      id: a.id,
      type: 'AGENT_ERROR' as EventType,
      description: `Ошибка агента: ${a.avatarEmoji || ''} ${a.displayName || a.name}`,
      timestamp: a.updatedAt,
    })),
    ...newConflicts.map(c => ({
      id: c.id,
      type: 'CONFLICT' as EventType,
      description: `Конфликт в RAG: ${c.topic}`,
      timestamp: c.detectedAt,
    })),
  ]

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50)
}

export type ActivityEvent = Awaited<ReturnType<typeof getActivityFeed>>[0]
