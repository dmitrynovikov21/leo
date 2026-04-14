'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getAggregateTokenStats } from '@/lib/token-tracking'
import { getActiveRateConfig } from '@/lib/token-rates'
import { getLitellmPool } from '@/lib/litellm-db'
import { TransactionType } from '@prisma/client'

/**
 * Get unit economics data for admin dashboard
 */
export async function getUnitEconomics(params: { dateFrom: Date; dateTo: Date }) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const { dateFrom, dateTo } = params

  // Get active rate config for context
  let rateConfig = null
  try {
    rateConfig = await getActiveRateConfig()
  } catch (e) {
    // No active rate config
  }

  // Get revenue from topups (always from leo-db — correct source)
  const topups = await prisma.tokenTransaction.findMany({
    where: {
      type: TransactionType.TOPUP,
      createdAt: { gte: dateFrom, lte: dateTo },
    },
  })

  const totalTokensFromTopups = topups.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  )
  const estimatedRevenueRub = rateConfig
    ? totalTokensFromTopups / rateConfig.rubToTokenRate
    : 0

  // Get cost data — prefer litellm-db (real OpenRouter spend), fallback to token_usage
  const pool = getLitellmPool()

  let totalCostUsd = 0
  let totalRequests = 0
  let totalPromptTokens = 0
  let totalCompletionTokens = 0
  let byModel: { model: string; requests: number; totalTokens: number; platformTokens: number; costUsd: number; percentOfTotal: number }[] = []
  const dailyData: Record<string, { date: string; revenue: number; costs: number; tokensCost: number }> = {}

  if (pool) {
    const [byModelRes, dailyRes] = await Promise.all([
      pool.query<{ model: string; requests: string; prompt_tokens: string; completion_tokens: string; cost: string }>(`
        SELECT
          model_group AS model,
          COUNT(*) AS requests,
          SUM(prompt_tokens)::bigint AS prompt_tokens,
          SUM(completion_tokens)::bigint AS completion_tokens,
          SUM(spend) AS cost
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= $1 AND "startTime" <= $2 AND spend > 0
        GROUP BY model_group
        ORDER BY cost DESC
      `, [dateFrom, dateTo]),
      pool.query<{ date: string; cost: number }>(`
        SELECT TO_CHAR("startTime", 'YYYY-MM-DD') AS date, SUM(spend)::float AS cost
        FROM "LiteLLM_SpendLogs"
        WHERE "startTime" >= $1 AND "startTime" <= $2 AND spend > 0
        GROUP BY date ORDER BY date
      `, [dateFrom, dateTo]),
    ])

    totalCostUsd = byModelRes.rows.reduce((sum, r) => sum + Number(r.cost), 0)
    totalRequests = byModelRes.rows.reduce((sum, r) => sum + Number(r.requests), 0)
    totalPromptTokens = byModelRes.rows.reduce((sum, r) => sum + Number(r.prompt_tokens), 0)
    totalCompletionTokens = byModelRes.rows.reduce((sum, r) => sum + Number(r.completion_tokens), 0)

    byModel = byModelRes.rows.map(r => ({
      model: r.model || 'unknown',
      requests: Number(r.requests),
      totalTokens: Number(r.prompt_tokens) + Number(r.completion_tokens),
      platformTokens: 0,
      costUsd: parseFloat(Number(r.cost).toFixed(6)),
      percentOfTotal: totalCostUsd > 0
        ? parseFloat(((Number(r.cost) / totalCostUsd) * 100).toFixed(2))
        : 0,
    }))

    dailyRes.rows.forEach(row => {
      dailyData[row.date] = { date: row.date, revenue: 0, costs: Number(row.cost), tokensCost: Number(row.cost) }
    })
  } else {
    // Fallback: local token_usage
    const tokenStats = await getAggregateTokenStats(dateFrom, dateTo)
    totalCostUsd = tokenStats.totalRealCostUsd
    totalRequests = tokenStats.totalUsages
    totalPromptTokens = tokenStats.totalLlmTokens

    byModel = tokenStats.byModel.map(m => ({
      model: m.model,
      requests: m.count,
      totalTokens: m.totalTokens,
      platformTokens: parseFloat(m.platformTokens.toFixed(2)),
      costUsd: parseFloat(m.realCostUsd.toFixed(6)),
      percentOfTotal: tokenStats.totalRealCostUsd > 0
        ? parseFloat(((m.realCostUsd / tokenStats.totalRealCostUsd) * 100).toFixed(2))
        : 0,
    }))

    const dailyUsages = await prisma.tokenUsage.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo }, isTest: false },
      select: { createdAt: true, realCostUsd: true },
    })
    dailyUsages.forEach(usage => {
      const dateStr = usage.createdAt.toISOString().split('T')[0]
      if (!dailyData[dateStr]) dailyData[dateStr] = { date: dateStr, revenue: 0, costs: 0, tokensCost: 0 }
      dailyData[dateStr].costs += parseFloat((usage.realCostUsd || 0).toString())
    })
  }

  // Add revenue to daily data from topups
  topups.forEach(topup => {
    const dateStr = topup.createdAt.toISOString().split('T')[0]
    if (!dailyData[dateStr]) dailyData[dateStr] = { date: dateStr, revenue: 0, costs: 0, tokensCost: 0 }
    const rubValue = rateConfig ? parseFloat(topup.amount.toString()) / rateConfig.rubToTokenRate : 0
    dailyData[dateStr].revenue += rubValue
  })

  const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date))

  const totalRevenueUsd = estimatedRevenueRub * 0.011
  const marginUsd = totalRevenueUsd - totalCostUsd
  const marginPercent = totalRevenueUsd > 0 ? (marginUsd / totalRevenueUsd) * 100 : 0

  return {
    period: { from: dateFrom, to: dateTo },
    metrics: {
      totalTokensFromTopups: parseFloat(totalTokensFromTopups.toFixed(2)),
      estimatedRevenueRub: parseFloat(estimatedRevenueRub.toFixed(2)),
      estimatedRevenueUsd: parseFloat(totalRevenueUsd.toFixed(6)),
      totalTokensUsedLlm: totalPromptTokens + totalCompletionTokens,
      totalTokensUsedPlatform: 0,
      totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
      marginUsd: parseFloat(marginUsd.toFixed(6)),
      marginPercent: parseFloat(marginPercent.toFixed(2)),
      totalRequests,
    },
    byModel,
    chartData,
    rateConfig,
  }
}

/**
 * Export unit economics data to CSV
 */
export async function exportUnitEconomicsCSV(params: { dateFrom: Date; dateTo: Date }) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const data = await getUnitEconomics(params)

  // Create CSV content
  const lines: string[] = []

  lines.push('Leo Platform Unit Economics Report')
  lines.push(`Period: ${params.dateFrom.toISOString().split('T')[0]} to ${params.dateTo.toISOString().split('T')[0]}`)
  lines.push('')

  // Summary metrics
  lines.push('SUMMARY METRICS')
  lines.push('Metric,Value')
  lines.push(`Total Revenue (RUB),${data.metrics.estimatedRevenueRub}`)
  lines.push(`Total Revenue (USD),${data.metrics.estimatedRevenueUsd}`)
  lines.push(`Total Costs (USD),${data.metrics.totalCostUsd}`)
  lines.push(`Margin (USD),${data.metrics.marginUsd}`)
  lines.push(`Margin (%),${data.metrics.marginPercent}%`)
  lines.push(`Total Requests,${data.metrics.totalRequests}`)
  lines.push(`Total LLM Tokens Used,${data.metrics.totalTokensUsedLlm}`)
  lines.push(`Total Platform Tokens Used,${data.metrics.totalTokensUsedPlatform}`)
  lines.push('')

  // By model breakdown
  lines.push('BREAKDOWN BY MODEL')
  lines.push('Model,Requests,Total Tokens,Platform Tokens,Cost (USD),% of Total')
  data.byModel.forEach((model) => {
    lines.push(
      `${model.model},${model.requests},${model.totalTokens},${model.platformTokens},${model.costUsd},${model.percentOfTotal}%`
    )
  })

  return {
    filename: `unit-economics-${new Date().toISOString().split('T')[0]}.csv`,
    content: lines.join('\n'),
  }
}

/**
 * Get unit economics summary for dashboard widget
 */
export async function getUnitEconomicsSummary() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get data for last 30 days
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  const data = await getUnitEconomics({
    dateFrom: startDate,
    dateTo: endDate,
  })

  return {
    period: '30 days',
    metrics: data.metrics,
    topModels: data.byModel.slice(0, 3),
  }
}
