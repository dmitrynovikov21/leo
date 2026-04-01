'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

function assertAdmin(session: any) {
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
}

export async function getAdminUsers(opts?: { limit?: number; offset?: number; search?: string }) {
  const session = await auth()
  assertAdmin(session)

  const { limit = 50, offset = 0, search } = opts ?? {}

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        agents: { select: { id: true, status: true } },
        subscription: {
          select: {
            puBalance: true,
            puLimit: true,
            puUsedThisCycle: true,
            isBlocked: true,
            status: true,
            plan: { select: { code: true, name: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  if (users.length === 0) return { users: [], total: 0 }

  const userIds = users.map(u => u.id)

  type LastActivity = { user_id: string; last_activity: Date }
  type PuTotal = { user_id: string; total_pu: number }
  type UsdTotal = { user_id: string; total_usd: number }

  const [lastActivities, puTotals, usdTotals] = await Promise.all([
    prisma.$queryRaw<LastActivity[]>(Prisma.sql`
      SELECT a."userId" as user_id, MAX(am.created_at) as last_activity
      FROM agent_messages am
      JOIN agents a ON a.id = am.agent_id
      WHERE a."userId" IN (${Prisma.join(userIds)}) AND am.is_test = false
      GROUP BY a."userId"
    `),
    prisma.$queryRaw<PuTotal[]>(Prisma.sql`
      SELECT user_id, ABS(SUM(pu_amount))::float as total_pu
      FROM pu_transactions
      WHERE user_id IN (${Prisma.join(userIds)}) AND type = 'OVERAGE_DEDUCTION'
      GROUP BY user_id
    `),
    prisma.$queryRaw<UsdTotal[]>(Prisma.sql`
      SELECT "userId" as user_id, SUM(real_cost_usd)::float as total_usd
      FROM token_usage
      WHERE "userId" IN (${Prisma.join(userIds)}) AND is_test = false
      GROUP BY "userId"
    `),
  ])

  const activityMap = new Map(lastActivities.map(r => [r.user_id, r.last_activity]))
  const puMap = new Map(puTotals.map(r => [r.user_id, r.total_pu]))
  const usdMap = new Map(usdTotals.map(r => [r.user_id, r.total_usd]))

  const result = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    agentsTotal: user.agents.length,
    agentsRunning: user.agents.filter(a => a.status === 'RUNNING').length,
    puBalance: Number(user.subscription?.puBalance ?? 0),
    puLimit: Number(user.subscription?.puLimit ?? 0),
    puUsedThisCycle: Number(user.subscription?.puUsedThisCycle ?? 0),
    isBlocked: user.subscription?.isBlocked ?? false,
    subscriptionStatus: user.subscription?.status ?? null,
    plan: user.subscription?.plan ?? null,
    lastActivity: activityMap.get(user.id) ?? null,
    totalPuSpent: puMap.get(user.id) ?? 0,
    totalUsdSpent: usdMap.get(user.id) ?? 0,
  }))

  return { users: result, total }
}

export type AdminUser = Awaited<ReturnType<typeof getAdminUsers>>['users'][0]

export async function getAdminUserDetail(userId: string) {
  const session = await auth()
  assertAdmin(session)

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      agents: {
        select: {
          id: true,
          displayName: true,
          name: true,
          avatarEmoji: true,
          status: true,
          createdAt: true,
          role: true,
          _count: { select: { messages: true, knowledgeBases: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      subscription: {
        select: {
          puBalance: true,
          puLimit: true,
          puUsedThisCycle: true,
          overagePuUsed: true,
          isBlocked: true,
          isOverdraft: true,
          status: true,
          billingCycleStartDate: true,
          nextResetDate: true,
          plan: { select: { code: true, name: true, monthlyPuLimit: true } },
        },
      },
      puTransactions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          puAmount: true,
          balanceBefore: true,
          balanceAfter: true,
          description: true,
          source: true,
          createdAt: true,
        },
      },
    },
  })

  const agentIds = user.agents.map(a => a.id)
  const d30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [tokenChart, documents, recentDialogs] = await Promise.all([
    prisma.$queryRaw<Array<{ date: string; prompt: bigint; completion: bigint; cost: number }>>`
      SELECT
        TO_CHAR(created_at, 'MM-DD') as date,
        SUM(prompt_tokens)::bigint as prompt,
        SUM(completion_tokens)::bigint as completion,
        SUM(real_cost_usd)::float as cost
      FROM token_usage
      WHERE "userId" = ${userId} AND created_at >= ${d30ago} AND is_test = false
      GROUP BY date ORDER BY date
    `,
    agentIds.length > 0
      ? prisma.knowledgeBase.findMany({
          where: { agentId: { in: agentIds } },
          select: {
            id: true,
            filename: true,
            fileSize: true,
            mimeType: true,
            status: true,
            createdAt: true,
            agentId: true,
            _count: { select: { chunks: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    agentIds.length > 0
      ? prisma.$queryRaw<
          Array<{
            agent_id: string
            telegram_user_id: string
            last_msg: string
            last_time: Date
            msg_count: bigint
          }>
        >(Prisma.sql`
        SELECT
          am.agent_id,
          am.telegram_user_id::text,
          (SELECT content FROM agent_messages am2
           WHERE am2.agent_id = am.agent_id AND am2.telegram_user_id = am.telegram_user_id
           ORDER BY am2.created_at DESC LIMIT 1) as last_msg,
          MAX(am.created_at) as last_time,
          COUNT(*)::bigint as msg_count
        FROM agent_messages am
        WHERE am.agent_id IN (${Prisma.join(agentIds)}) AND am.is_test = false
        GROUP BY am.agent_id, am.telegram_user_id
        ORDER BY last_time DESC
        LIMIT 10
      `)
      : Promise.resolve([]),
  ])

  return {
    user: {
      ...user,
      subscription: user.subscription
        ? {
            ...user.subscription,
            puBalance: Number(user.subscription.puBalance),
            puLimit: Number(user.subscription.puLimit),
            puUsedThisCycle: Number(user.subscription.puUsedThisCycle),
            overagePuUsed: Number(user.subscription.overagePuUsed),
            plan: {
              ...user.subscription.plan,
              monthlyPuLimit: Number(user.subscription.plan.monthlyPuLimit),
            },
          }
        : null,
      puTransactions: user.puTransactions.map(t => ({
        ...t,
        puAmount: Number(t.puAmount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
      })),
    },
    tokenChart: tokenChart.map(r => ({
      date: r.date,
      prompt: Number(r.prompt),
      completion: Number(r.completion),
      cost: Number(r.cost ?? 0),
    })),
    documents,
    recentDialogs: recentDialogs.map(r => ({
      agentId: r.agent_id,
      telegramUserId: r.telegram_user_id,
      lastMessage: r.last_msg?.slice(0, 100) ?? '',
      lastTime: r.last_time,
      messageCount: Number(r.msg_count),
    })),
  }
}

export type AdminUserDetail = Awaited<ReturnType<typeof getAdminUserDetail>>

export async function adjustPuBalance(userId: string, amount: number, description: string) {
  const session = await auth()
  assertAdmin(session)

  const sub = await prisma.userSubscription.findUnique({ where: { userId } })
  if (!sub) throw new Error('Подписка не найдена')

  const newBalance = Number(sub.puBalance) + amount

  await prisma.$transaction([
    prisma.userSubscription.update({
      where: { userId },
      data: { puBalance: newBalance },
    }),
    prisma.puTransaction.create({
      data: {
        userId,
        type: 'ADMIN_ADJUSTMENT',
        puAmount: amount,
        balanceBefore: Number(sub.puBalance),
        balanceAfter: newBalance,
        description,
        source: 'ADMIN_ADJUSTMENT',
        createdBy: session!.user!.id,
      },
    }),
  ])
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  const session = await auth()
  assertAdmin(session)

  await prisma.userSubscription.update({
    where: { userId },
    data: { isBlocked: blocked },
  })
}

export async function changeUserEmail(userId: string, newEmail: string) {
  const session = await auth()
  assertAdmin(session)

  const trimmed = newEmail.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) throw new Error('Некорректный email')

  // Check if email already taken
  const existing = await prisma.user.findUnique({ where: { email: trimmed } })
  if (existing && existing.id !== userId) throw new Error('Этот email уже используется')

  await prisma.user.update({
    where: { id: userId },
    data: { email: trimmed },
  })
}
