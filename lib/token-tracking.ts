import { prisma } from '@/lib/db'
import { calculatePlatformTokensFromLlm } from '@/lib/token-rates'
import { deductTokens } from '@/lib/balance'
import { getBillingSystem, getUserBillingType } from '@/lib/billing-adapter'
import { calculateLlmPuCost } from '@/lib/pu-calculator'
import { Decimal } from '@prisma/client/runtime/library'
import { TransactionType } from '@prisma/client'

export interface TrackTokenUsageParams {
  userId: string
  agentId?: string
  model: string
  promptTokens: number
  completionTokens: number
  responseTimeMs: number
  isTest?: boolean
}

/**
 * Get the cost configuration for a specific model
 */
export async function getModelCost(modelName: string) {
  const config = await prisma.modelCostConfig.findFirst({
    where: {
      modelName,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    console.warn(`No active cost configuration found for model: ${modelName}`)
    return null
  }

  return {
    modelName: config.modelName,
    inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
    outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
  }
}

/**
 * Calculate real USD cost from model pricing
 */
export async function calculateRealCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): Promise<number> {
  const modelCost = await getModelCost(model)

  if (!modelCost) {
    // Return 0 if no cost config found (should log warning)
    return 0
  }

  // Cost per token = cost per million / 1,000,000
  const inputCostPerToken = modelCost.inputCostPerMillion / 1_000_000
  const outputCostPerToken = modelCost.outputCostPerMillion / 1_000_000

  const totalCostUsd =
    promptTokens * inputCostPerToken + completionTokens * outputCostPerToken

  return parseFloat(totalCostUsd.toFixed(6))
}

/**
 * Calculate platform tokens from LLM tokens (wrapper)
 */
export async function calculatePlatformTokens(llmTokensUsed: number): Promise<number> {
  return await calculatePlatformTokensFromLlm(llmTokensUsed)
}

/**
 * Track token usage and deduct from user balance
 */
export async function trackTokenUsage(params: TrackTokenUsageParams): Promise<void> {
  const {
    userId,
    agentId,
    model,
    promptTokens,
    completionTokens,
    responseTimeMs,
    isTest = false,
  } = params

  // Skip tracking for test requests (unless we still want to record them)
  const totalLlmTokens = promptTokens + completionTokens

  // 1. Calculate real cost in USD
  const realCostUsd = await calculateRealCost(model, promptTokens, completionTokens)

  // 2. Calculate Charges (PU System Forced)
  // const billingType = await getUserBillingType(userId) // Always 'PU' now

  // Calculate PU
  const chargedAmount = calculateLlmPuCost(promptTokens, completionTokens)
  // Store PU amount in 'platformTokensCharged' column
  const platformTokensForRecord = chargedAmount

  // 3. Create token usage record
  const tokenUsage = await prisma.tokenUsage.create({
    data: {
      userId,
      agentId: agentId || null,
      model,
      promptTokens,
      completionTokens,
      totalTokens: totalLlmTokens,
      responseTimeMs,
      isTest,
      platformTokensCharged: new Decimal(platformTokensForRecord),
      realCostUsd: new Decimal(realCostUsd),
    },
  })

  // 4. Deduct tokens from user balance (skip for test requests)
  if (!isTest) {
    const billing = await getBillingSystem(userId)
    await billing.deductUsage(userId, chargedAmount, {
      source: 'LLM_USAGE',
      description: `Target: ${model} (${totalLlmTokens} tokens)`,
      metadata: {
        model,
        promptTokens,
        completionTokens,
        totalLlmTokens,
        tokenUsageId: tokenUsage.id,
        agentId,
        realCostUsd,
        billingType: 'PU'
      },
    })
  }
}

/**
 * Get token usage statistics for a user
 */
export async function getUserTokenStats(userId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const usages = await prisma.tokenUsage.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
      isTest: false, // Exclude test requests
    },
  })

  const totalPromptTokens = usages.reduce((sum, u) => sum + u.promptTokens, 0)
  const totalCompletionTokens = usages.reduce((sum, u) => sum + u.completionTokens, 0)
  const totalPlatformTokens = usages.reduce(
    (sum, u) => sum + parseFloat((u.platformTokensCharged || 0).toString()),
    0
  )
  const totalRealCostUsd = usages.reduce(
    (sum, u) => sum + parseFloat((u.realCostUsd || 0).toString()),
    0
  )

  // Group by model
  const byModel: Record<string, any> = {}
  usages.forEach((usage) => {
    if (!byModel[usage.model]) {
      byModel[usage.model] = {
        model: usage.model,
        count: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        platformTokens: 0,
        realCostUsd: 0,
      }
    }
    byModel[usage.model].count += 1
    byModel[usage.model].promptTokens += usage.promptTokens
    byModel[usage.model].completionTokens += usage.completionTokens
    byModel[usage.model].totalTokens += usage.totalTokens
    byModel[usage.model].platformTokens += parseFloat(
      (usage.platformTokensCharged || 0).toString()
    )
    byModel[usage.model].realCostUsd += parseFloat((usage.realCostUsd || 0).toString())
  })

  return {
    days,
    totalUsages: usages.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalLlmTokens: totalPromptTokens + totalCompletionTokens,
    totalPlatformTokens,
    totalRealCostUsd: parseFloat(totalRealCostUsd.toFixed(6)),
    byModel: Object.values(byModel),
  }
}

/**
 * Get aggregate token statistics across all users (for admin)
 */
export async function getAggregateTokenStats(startDate: Date, endDate: Date) {
  const usages = await prisma.tokenUsage.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      isTest: false,
    },
  })

  const totalPromptTokens = usages.reduce((sum, u) => sum + u.promptTokens, 0)
  const totalCompletionTokens = usages.reduce((sum, u) => sum + u.completionTokens, 0)
  const totalPlatformTokens = usages.reduce(
    (sum, u) => sum + parseFloat((u.platformTokensCharged || 0).toString()),
    0
  )
  const totalRealCostUsd = usages.reduce(
    (sum, u) => sum + parseFloat((u.realCostUsd || 0).toString()),
    0
  )

  // Get transactions data for revenue
  const topUps = await prisma.tokenTransaction.findMany({
    where: {
      type: TransactionType.TOPUP,
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  const totalTokensFromTopUps = topUps.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  )

  // Group by model
  const byModel: Record<string, any> = {}
  usages.forEach((usage) => {
    if (!byModel[usage.model]) {
      byModel[usage.model] = {
        model: usage.model,
        count: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        platformTokens: 0,
        realCostUsd: 0,
      }
    }
    byModel[usage.model].count += 1
    byModel[usage.model].promptTokens += usage.promptTokens
    byModel[usage.model].completionTokens += usage.completionTokens
    byModel[usage.model].totalTokens += usage.totalTokens
    byModel[usage.model].platformTokens += parseFloat(
      (usage.platformTokensCharged || 0).toString()
    )
    byModel[usage.model].realCostUsd += parseFloat((usage.realCostUsd || 0).toString())
  })

  return {
    startDate,
    endDate,
    totalUsages: usages.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalLlmTokens: totalPromptTokens + totalCompletionTokens,
    totalPlatformTokens: parseFloat(totalPlatformTokens.toFixed(2)),
    totalRealCostUsd: parseFloat(totalRealCostUsd.toFixed(6)),
    totalTokensFromTopUps: parseFloat(totalTokensFromTopUps.toFixed(2)),
    byModel: Object.values(byModel),
  }
}
