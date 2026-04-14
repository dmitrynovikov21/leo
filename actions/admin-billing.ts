'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getLitellmPool } from '@/lib/litellm-db'

function assertAdmin(session: any) {
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')
}

export type Period = 'today' | '7d' | '30d'

function getPeriodStart(period: Period): Date {
  const now = new Date()
  if (period === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
}

export async function getBillingPuStats(period: Period = '30d') {
  const session = await auth()
  assertAdmin(session)

  const since = getPeriodStart(period)

  const [totalBalance, puSpent, puChart] = await Promise.all([
    prisma.userSubscription.aggregate({ _sum: { puBalance: true } }),
    prisma.puTransaction.aggregate({
      where: { type: 'OVERAGE_DEDUCTION', createdAt: { gte: since } },
      _sum: { puAmount: true },
    }),
    prisma.$queryRaw<Array<{ date: string; spent: number }>>`
      SELECT TO_CHAR(created_at, 'MM-DD') as date, ABS(SUM(pu_amount))::float as spent
      FROM pu_transactions
      WHERE type = 'OVERAGE_DEDUCTION' AND created_at >= ${since}
      GROUP BY date ORDER BY date
    `,
  ])

  type TopUser = { user_id: string; email: string | null; total: number }
  const topUsers = await prisma.$queryRaw<TopUser[]>`
    SELECT pt.user_id, u.email, ABS(SUM(pt.pu_amount))::float as total
    FROM pu_transactions pt
    JOIN users u ON u.id = pt.user_id
    WHERE pt.type = 'OVERAGE_DEDUCTION' AND pt.created_at >= ${since}
    GROUP BY pt.user_id, u.email
    ORDER BY total DESC
    LIMIT 10
  `

  return {
    totalBalance: Number(totalBalance._sum.puBalance ?? 0),
    puSpent: Math.abs(Number(puSpent._sum.puAmount ?? 0)),
    chartData: puChart,
    topUsers,
  }
}

export async function getPuTransactions(opts?: {
  limit?: number
  offset?: number
  userId?: string
  type?: string
}) {
  const session = await auth()
  assertAdmin(session)

  const { limit = 50, offset = 0, userId, type } = opts ?? {}

  const where: any = {}
  if (userId) where.userId = userId
  if (type) where.type = type

  const [transactions, total] = await Promise.all([
    prisma.puTransaction.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        type: true,
        puAmount: true,
        balanceBefore: true,
        balanceAfter: true,
        source: true,
        description: true,
        costRub: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.puTransaction.count({ where }),
  ])

  return {
    transactions: transactions.map(t => ({
      ...t,
      puAmount: Number(t.puAmount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      costRub: t.costRub ? Number(t.costRub) : null,
    })),
    total,
  }
}

export async function getUsdStats(period: Period = '30d') {
  const session = await auth()
  assertAdmin(session)

  const since = getPeriodStart(period)
  const pool = getLitellmPool()

  // If litellm-db is available — use it as source of truth (real OpenRouter spend)
  if (pool) {
    const [byModelRes, chartRes] = await Promise.all([
      pool.query<{ model: string; requests: string; prompt_tokens: string; completion_tokens: string; cost: string }>(`
        SELECT
          model_group AS model,
          COUNT(*) AS requests,
          SUM(prompt_tokens) AS prompt_tokens,
          SUM(completion_tokens) AS completion_tokens,
          SUM(spend) AS cost
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= $1 AND spend > 0
        GROUP BY model_group
        ORDER BY cost DESC
      `, [since]),
      pool.query<{ date: string; cost: number }>(`
        SELECT TO_CHAR("startTime", 'MM-DD') AS date, SUM(spend)::float AS cost
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= $1 AND spend > 0
        GROUP BY date ORDER BY date
      `, [since]),
    ])

    const byModel = byModelRes.rows.map(r => ({
      model: r.model || 'unknown',
      requests: Number(r.requests),
      promptTokens: Number(r.prompt_tokens),
      completionTokens: Number(r.completion_tokens),
      costUsd: Number(r.cost),
    }))

    const totalCostUsd = byModel.reduce((sum, m) => sum + m.costUsd, 0)

    return {
      totalCostUsd,
      byModel,
      byRequestType: [] as { requestType: string; requests: number; costUsd: number }[],
      chartData: chartRes.rows,
      source: 'litellm' as const,
    }
  }

  // Fallback: local token_usage table
  const [byModel, byRequestType, costChart] = await Promise.all([
    prisma.tokenUsage.groupBy({
      by: ['model'],
      where: { isTest: false, createdAt: { gte: since } },
      _count: true,
      _sum: { promptTokens: true, completionTokens: true, realCostUsd: true },
    }),
    prisma.tokenUsage.groupBy({
      by: ['requestType'],
      where: { isTest: false, createdAt: { gte: since } },
      _count: true,
      _sum: { realCostUsd: true },
    }),
    prisma.$queryRaw<Array<{ date: string; cost: number }>>`
      SELECT TO_CHAR(created_at, 'MM-DD') as date, SUM(real_cost_usd)::float as cost
      FROM token_usage
      WHERE is_test = false AND created_at >= ${since}
      GROUP BY date ORDER BY date
    `,
  ])

  const totalCost = byModel.reduce((sum, m) => sum + Number(m._sum.realCostUsd ?? 0), 0)

  return {
    totalCostUsd: totalCost,
    byModel: byModel
      .map(m => ({
        model: m.model,
        requests: m._count,
        promptTokens: m._sum.promptTokens ?? 0,
        completionTokens: m._sum.completionTokens ?? 0,
        costUsd: Number(m._sum.realCostUsd ?? 0),
      }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byRequestType: byRequestType
      .map(r => ({
        requestType: r.requestType,
        requests: r._count,
        costUsd: Number(r._sum.realCostUsd ?? 0),
      }))
      .sort((a, b) => b.costUsd - a.costUsd),
    chartData: costChart,
    source: 'local' as const,
  }
}

export async function getFilesStats() {
  const session = await auth()
  assertAdmin(session)

  const [totalFiles, statusBreakdown, mimeBreakdown, dedupStats] = await Promise.all([
    prisma.knowledgeBase.aggregate({
      _count: true,
      _sum: { fileSize: true },
    }),
    prisma.knowledgeBase.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.$queryRaw<Array<{ mime: string; count: bigint; size: bigint }>>`
      SELECT "mimeType" as mime, COUNT(*)::bigint as count, SUM("fileSize")::bigint as size
      FROM knowledge_bases
      GROUP BY "mimeType"
      ORDER BY count DESC
    `,
    prisma.fileProcessingCache.aggregate({
      where: { chargePercentage: { lt: 100 } },
      _count: true,
      _sum: { puCharged: true },
    }),
  ])

  return {
    totalFiles: totalFiles._count,
    totalSize: totalFiles._sum.fileSize ?? 0,
    byStatus: statusBreakdown.map(s => ({ status: s.status, count: s._count })),
    byMime: mimeBreakdown.map(m => ({
      mime: m.mime,
      count: Number(m.count),
      size: Number(m.size),
    })),
    dedupCount: dedupStats._count,
    dedupPuSaved: Number(dedupStats._sum.puCharged ?? 0),
  }
}
