'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

function assertAdmin(session: any) {
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
}

export async function getAdminAgents(opts?: {
  limit?: number
  offset?: number
  search?: string
  status?: string
}) {
  const session = await auth()
  assertAdmin(session)

  const { limit = 50, offset = 0, search, status } = opts ?? {}

  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        avatarEmoji: true,
        role: true,
        status: true,
        containerId: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, name: true } },
        _count: { select: { knowledgeBases: true, notes: true } },
      },
    }),
    prisma.agent.count({ where }),
  ])

  if (agents.length === 0) return { agents: [], total: 0 }

  const agentIds = agents.map(a => a.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  type AgentMsgStats = {
    agent_id: string
    unique_users: bigint
    today_users: bigint
  }
  type ConflictCount = { agent_id: string; count: bigint }

  const [msgStats, conflictCounts] = await Promise.all([
    prisma.$queryRaw<AgentMsgStats[]>(Prisma.sql`
      SELECT
        agent_id,
        COUNT(DISTINCT telegram_user_id)::bigint as unique_users,
        COUNT(DISTINCT CASE WHEN created_at >= ${today} THEN telegram_user_id END)::bigint as today_users
      FROM agent_messages
      WHERE agent_id IN (${Prisma.join(agentIds)}) AND is_test = false
      GROUP BY agent_id
    `),
    prisma.$queryRaw<ConflictCount[]>(Prisma.sql`
      SELECT agent_id, COUNT(*)::bigint as count
      FROM knowledge_conflicts
      WHERE agent_id IN (${Prisma.join(agentIds)})
      GROUP BY agent_id
    `),
  ])

  const statsMap = new Map(msgStats.map(s => [s.agent_id, s]))
  const conflictsMap = new Map(conflictCounts.map(c => [c.agent_id, Number(c.count)]))

  const result = agents.map(agent => {
    const s = statsMap.get(agent.id)
    return {
      id: agent.id,
      name: agent.displayName || agent.name,
      emoji: agent.avatarEmoji || '🤖',
      role: agent.role,
      status: agent.status,
      containerId: agent.containerId,
      createdAt: agent.createdAt,
      userId: agent.userId,
      ownerEmail: agent.user.email,
      ownerName: agent.user.name,
      uniqueUsers: s ? Number(s.unique_users) : 0,
      dialogsToday: s ? Number(s.today_users) : 0,
      docsCount: agent._count.knowledgeBases,
      notesCount: agent._count.notes,
      conflictsCount: conflictsMap.get(agent.id) ?? 0,
    }
  })

  return { agents: result, total }
}

export type AdminAgent = Awaited<ReturnType<typeof getAdminAgents>>['agents'][0]

export async function getAdminAgentDetail(agentId: string) {
  const session = await auth()
  assertAdmin(session)

  const agent = await prisma.agent.findUniqueOrThrow({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      displayName: true,
      avatarEmoji: true,
      role: true,
      description: true,
      status: true,
      containerId: true,
      containerName: true,
      createdAt: true,
      userId: true,
      temperature: true,
      debounceMs: true,
      tone: true,
      guardrails: true,
      workSchedule: true,
      user: { select: { email: true, name: true } },
      promptVersions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, version: true, isActive: true, createdAt: true, content: true },
      },
      knowledgeBases: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          mimeType: true,
          status: true,
          createdAt: true,
          _count: { select: { chunks: true } },
        },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, content: true, createdAt: true },
      },
    },
  })

  const [conflicts, dialogs, tokenStats] = await Promise.all([
    prisma.knowledgeConflict.findMany({
      where: { agentId },
      orderBy: { detectedAt: 'desc' },
      take: 20,
      select: { id: true, topic: true, status: true, detectedAt: true, details: true },
    }),
    prisma.$queryRaw<
      Array<{
        telegram_user_id: string
        msg_count: bigint
        last_time: Date
        last_msg: string
      }>
    >`
      SELECT
        telegram_user_id::text,
        COUNT(*)::bigint as msg_count,
        MAX(created_at) as last_time,
        (SELECT content FROM agent_messages am2
         WHERE am2.agent_id = ${agentId} AND am2.telegram_user_id = am.telegram_user_id
         ORDER BY am2.created_at DESC LIMIT 1) as last_msg
      FROM agent_messages am
      WHERE agent_id = ${agentId} AND is_test = false
      GROUP BY telegram_user_id
      ORDER BY last_time DESC
      LIMIT 30
    `,
    prisma.tokenUsage.aggregate({
      where: { agentId, isTest: false },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        realCostUsd: true,
        platformTokensCharged: true,
      },
      _avg: { responseTimeMs: true },
      _count: true,
    }),
  ])

  return {
    agent: {
      ...agent,
      promptVersions: agent.promptVersions.map(v => ({
        ...v,
        content: v.content.slice(0, 200) + (v.content.length > 200 ? '...' : ''),
      })),
    },
    conflicts,
    dialogs: dialogs.map(d => ({
      telegramUserId: d.telegram_user_id,
      messageCount: Number(d.msg_count),
      lastTime: d.last_time,
      lastMessage: d.last_msg?.slice(0, 100) ?? '',
    })),
    tokenStats: {
      requests: tokenStats._count,
      promptTokens: tokenStats._sum.promptTokens ?? 0,
      completionTokens: tokenStats._sum.completionTokens ?? 0,
      realCostUsd: Number(tokenStats._sum.realCostUsd ?? 0),
      platformTokensCharged: Number(tokenStats._sum.platformTokensCharged ?? 0),
      avgResponseMs: Math.round(tokenStats._avg.responseTimeMs ?? 0),
    },
  }
}

export type AdminAgentDetail = Awaited<ReturnType<typeof getAdminAgentDetail>>

export async function getAgentDialog(agentId: string, telegramUserId: string) {
  const session = await auth()
  assertAdmin(session)

  const [messages, summary] = await Promise.all([
    prisma.agentMessage.findMany({
      where: {
        agentId,
        telegramUserId: BigInt(telegramUserId),
        isTest: false,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        messageType: true,
        content: true,
        createdAt: true,
      },
    }),
    prisma.agentSummary.findFirst({
      where: { agentId, telegramUserId: BigInt(telegramUserId) },
      select: { summary: true, createdAt: true },
    }),
  ])

  return {
    messages: messages.map(m => ({
      id: m.id,
      type: m.messageType,
      content: m.content,
      timestamp: m.createdAt,
    })),
    summary,
  }
}
