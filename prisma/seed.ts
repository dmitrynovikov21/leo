import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. Create initial token rate configuration
  console.log('📊 Seeding token rate configuration...')

  const existingRates = await prisma.tokenRateConfig.count()
  if (existingRates === 0) {
    await prisma.tokenRateConfig.create({
      data: {
        rubToTokenRate: new Decimal('2.0'), // 1₽ = 2 tokens
        llmTokenToTokenRate: new Decimal('2.0'), // 1 LLM token = 2 platform tokens
        isActive: true,
        updatedBy: 'system',
      },
    })
    console.log('✅ Created initial token rate: 1₽ = 2 tokens, 1 LLM token = 2 platform tokens')
  } else {
    console.log('⏭️  Token rate configuration already exists, skipping...')
  }

  // 2. Create model cost configurations
  console.log('💰 Seeding model cost configurations...')

  const modelCosts = [
    {
      modelName: 'claude-sonnet-4-6',
      inputCostPerMillion: new Decimal('3.0'),
      outputCostPerMillion: new Decimal('15.0'),
    },
    {
      modelName: 'claude-opus-4-6',
      inputCostPerMillion: new Decimal('15.0'),
      outputCostPerMillion: new Decimal('75.0'),
    },
    {
      modelName: 'claude-sonnet-4-5',
      inputCostPerMillion: new Decimal('3.0'),
      outputCostPerMillion: new Decimal('15.0'),
    },
    {
      modelName: 'gemini-3.1-pro-preview',
      inputCostPerMillion: new Decimal('2.0'),
      outputCostPerMillion: new Decimal('12.0'),
    },
    {
      modelName: 'gemini-2.5-pro',
      inputCostPerMillion: new Decimal('1.25'),
      outputCostPerMillion: new Decimal('10.0'),
    },
  ]

  let createdCount = 0
  for (const cost of modelCosts) {
    const existing = await prisma.modelCostConfig.findFirst({
      where: {
        modelName: cost.modelName,
        isActive: true,
      },
    })

    if (!existing) {
      await prisma.modelCostConfig.create({
        data: {
          ...cost,
          isActive: true,
          updatedBy: 'system',
        },
      })
      createdCount++
      console.log(`  ✅ ${cost.modelName}: $${cost.inputCostPerMillion}/$${cost.outputCostPerMillion} per 1M tokens`)
    }
  }

  if (createdCount === 0) {
    console.log('⏭️  Model costs already configured, skipping...')
  } else {
    console.log(`✅ Created ${createdCount} model cost configurations`)
  }

  console.log('\n✨ Database seed completed successfully!')
  console.log('📝 Next steps:')
  console.log('   1. Give existing users starting balance: npm run seed:users-balance')
  console.log('   2. Verify configurations in admin panel')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
