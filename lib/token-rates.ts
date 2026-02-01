import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

export interface TokenRateConfig {
  id: string
  rubToTokenRate: Decimal
  llmTokenToTokenRate: Decimal
  isActive: boolean
}

/**
 * Get the currently active token rate configuration
 */
export async function getActiveRateConfig(): Promise<{
  rubToTokenRate: number
  llmTokenToTokenRate: number
}> {
  const config = await prisma.tokenRateConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    throw new Error('No active token rate configuration found')
  }

  return {
    rubToTokenRate: parseFloat(config.rubToTokenRate.toString()),
    llmTokenToTokenRate: parseFloat(config.llmTokenToTokenRate.toString()),
  }
}

/**
 * Calculate platform tokens from rubles
 */
export async function calculateTokensFromRubles(rubles: number): Promise<number> {
  const { rubToTokenRate } = await getActiveRateConfig()
  return rubles * rubToTokenRate
}

/**
 * Calculate platform tokens from LLM tokens
 */
export async function calculatePlatformTokensFromLlm(llmTokens: number): Promise<number> {
  const { llmTokenToTokenRate } = await getActiveRateConfig()
  return llmTokens * llmTokenToTokenRate
}

/**
 * Get all rate configs (with pagination)
 */
export async function getAllRateConfigs(limit: number = 50, offset: number = 0) {
  const configs = await prisma.tokenRateConfig.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.tokenRateConfig.count()

  return {
    configs: configs.map(config => ({
      id: config.id,
      rubToTokenRate: parseFloat(config.rubToTokenRate.toString()),
      llmTokenToTokenRate: parseFloat(config.llmTokenToTokenRate.toString()),
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedBy: config.updatedBy,
    })),
    total,
  }
}
