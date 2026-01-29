'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Get all token rate configurations
 * Only accessible to admins
 */
export async function getTokenRates(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

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

/**
 * Get the currently active token rate
 */
export async function getActiveTokenRate() {
  const config = await prisma.tokenRateConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!config) {
    return null
  }

  return {
    id: config.id,
    rubToTokenRate: parseFloat(config.rubToTokenRate.toString()),
    llmTokenToTokenRate: parseFloat(config.llmTokenToTokenRate.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}

/**
 * Create a new token rate configuration
 * Automatically deactivates the previous active rate
 */
export async function createTokenRate(data: {
  rubToTokenRate: number
  llmTokenToTokenRate: number
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  // Validate rates
  if (data.rubToTokenRate <= 0 || data.llmTokenToTokenRate <= 0) {
    throw new Error('Rates must be greater than 0')
  }

  // Deactivate previous active rate
  await prisma.tokenRateConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  })

  // Create new rate
  const config = await prisma.tokenRateConfig.create({
    data: {
      rubToTokenRate: new Decimal(data.rubToTokenRate),
      llmTokenToTokenRate: new Decimal(data.llmTokenToTokenRate),
      isActive: true,
      updatedBy: session.user.id,
    },
  })

  return {
    id: config.id,
    rubToTokenRate: parseFloat(config.rubToTokenRate.toString()),
    llmTokenToTokenRate: parseFloat(config.llmTokenToTokenRate.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}

/**
 * Update an existing token rate configuration
 */
export async function updateTokenRate(
  id: string,
  data: {
    rubToTokenRate?: number
    llmTokenToTokenRate?: number
  }
) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const updateData: any = {}

  if (data.rubToTokenRate !== undefined) {
    if (data.rubToTokenRate <= 0) {
      throw new Error('rubToTokenRate must be greater than 0')
    }
    updateData.rubToTokenRate = new Decimal(data.rubToTokenRate)
  }

  if (data.llmTokenToTokenRate !== undefined) {
    if (data.llmTokenToTokenRate <= 0) {
      throw new Error('llmTokenToTokenRate must be greater than 0')
    }
    updateData.llmTokenToTokenRate = new Decimal(data.llmTokenToTokenRate)
  }

  const config = await prisma.tokenRateConfig.update({
    where: { id },
    data: {
      ...updateData,
      updatedBy: session.user.id,
    },
  })

  return {
    id: config.id,
    rubToTokenRate: parseFloat(config.rubToTokenRate.toString()),
    llmTokenToTokenRate: parseFloat(config.llmTokenToTokenRate.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}
