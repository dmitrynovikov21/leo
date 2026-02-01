'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Get all model cost configurations
 * Only accessible to admins
 */
export async function getModelCosts(limit: number = 50, offset: number = 0) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const configs = await prisma.modelCostConfig.findMany({
    orderBy: { modelName: 'asc', createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  const total = await prisma.modelCostConfig.count()

  return {
    configs: configs.map(config => ({
      id: config.id,
      modelName: config.modelName,
      inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
      outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedBy: config.updatedBy,
    })),
    total,
  }
}

/**
 * Get active cost config for a specific model
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
    return null
  }

  return {
    id: config.id,
    modelName: config.modelName,
    inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
    outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}

/**
 * Create or update a model cost configuration
 */
export async function upsertModelCost(data: {
  modelName: string
  inputCostPerMillion: number
  outputCostPerMillion: number
  isActive?: boolean
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  // Validate costs
  if (data.inputCostPerMillion < 0 || data.outputCostPerMillion < 0) {
    throw new Error('Costs cannot be negative')
  }

  const config = await prisma.modelCostConfig.upsert({
    where: {
      modelName_isActive: {
        modelName: data.modelName,
        isActive: data.isActive ?? true,
      },
    },
    update: {
      inputCostPerMillion: new Decimal(data.inputCostPerMillion),
      outputCostPerMillion: new Decimal(data.outputCostPerMillion),
      updatedBy: session.user.id,
    },
    create: {
      modelName: data.modelName,
      inputCostPerMillion: new Decimal(data.inputCostPerMillion),
      outputCostPerMillion: new Decimal(data.outputCostPerMillion),
      isActive: data.isActive ?? true,
      updatedBy: session.user.id,
    },
  })

  return {
    id: config.id,
    modelName: config.modelName,
    inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
    outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}

/**
 * Delete a model cost configuration (soft delete via isActive)
 */
export async function deleteModelCost(id: string) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const config = await prisma.modelCostConfig.update({
    where: { id },
    data: {
      isActive: false,
      updatedBy: session.user.id,
    },
  })

  return {
    id: config.id,
    modelName: config.modelName,
    inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
    outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedBy: config.updatedBy,
  }
}

/**
 * Seed default model costs (run once)
 */
export async function seedDefaultModelCosts() {
  const session = await auth()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }

  const defaults = [
    { modelName: 'gpt-4o', inputCostPerMillion: 2.5, outputCostPerMillion: 10.0 },
    { modelName: 'gpt-4o-mini', inputCostPerMillion: 0.15, outputCostPerMillion: 0.6 },
    { modelName: 'claude-haiku-4', inputCostPerMillion: 0.25, outputCostPerMillion: 1.25 },
    {
      modelName: 'claude-3-5-sonnet-20241022',
      inputCostPerMillion: 3.0,
      outputCostPerMillion: 15.0,
    },
    { modelName: 'claude-opus-4', inputCostPerMillion: 15.0, outputCostPerMillion: 75.0 },
  ]

  const created = []

  for (const def of defaults) {
    const config = await prisma.modelCostConfig.upsert({
      where: {
        modelName_isActive: {
          modelName: def.modelName,
          isActive: true,
        },
      },
      update: {},
      create: {
        modelName: def.modelName,
        inputCostPerMillion: new Decimal(def.inputCostPerMillion),
        outputCostPerMillion: new Decimal(def.outputCostPerMillion),
        isActive: true,
        updatedBy: session.user.id,
      },
    })

    created.push({
      id: config.id,
      modelName: config.modelName,
      inputCostPerMillion: parseFloat(config.inputCostPerMillion.toString()),
      outputCostPerMillion: parseFloat(config.outputCostPerMillion.toString()),
      isActive: config.isActive,
    })
  }

  return created
}
