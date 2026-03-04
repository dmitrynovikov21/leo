import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function seedSubscriptionPlans() {
  const plans = [
    {
      code: 'FREE',
      name: 'Бесплатный',
      monthlyPuLimit: new Decimal(50),
      priceMonthlyRub: new Decimal(0),
      overagePuPriceRub: new Decimal(0),
      overageDialogPriceRub: new Decimal(0),
      features: [
        { text: '50 Единиц обработки в месяц', included: true },
        { text: '• 3 документа', included: true },
        { text: '• 20 диалогов', included: true },
        { text: 'Базовая поддержка', included: true },
      ],
      stripePriceId: null,
      displayOrder: 0,
    },
    {
      code: 'BASIC',
      name: 'Базовый',
      monthlyPuLimit: new Decimal(200),
      priceMonthlyRub: new Decimal(3900),
      overagePuPriceRub: new Decimal(8),
      overageDialogPriceRub: new Decimal(3),
      features: [
        { text: '200 Единиц обработки в месяц', included: true },
        { text: '• 40 документов', included: true },
        { text: '• 200 диалогов', included: true },
        { text: 'Базовая поддержка', included: true },
      ],
      stripePriceId: null,
      displayOrder: 1,
    },
    {
      code: 'PRO',
      name: 'Профессиональный',
      monthlyPuLimit: new Decimal(800),
      priceMonthlyRub: new Decimal(9900),
      overagePuPriceRub: new Decimal(8),
      overageDialogPriceRub: new Decimal(3),
      features: [
        { text: '800 Единиц обработки в месяц', included: true },
        { text: '• 150 документов', included: true },
        { text: '• 800 диалогов', included: true },
        { text: 'Приоритетная поддержка', included: true },
      ],
      stripePriceId: null,
      displayOrder: 2,
    },
    {
      code: 'BUSINESS',
      name: 'Бизнес',
      monthlyPuLimit: new Decimal(4000),
      priceMonthlyRub: new Decimal(39900),
      overagePuPriceRub: new Decimal(8),
      overageDialogPriceRub: new Decimal(3),
      features: [
        { text: '4,000 Единиц обработки в месяц', included: true },
        { text: '• 800 документов', included: true },
        { text: '• 4,000 диалогов', included: true },
        { text: '24/7 поддержка', included: true },
        { text: 'API доступ', included: true },
      ],
      stripePriceId: null,
      displayOrder: 3,
    },
    {
      code: 'ENTERPRISE',
      name: 'Энтерпрайз',
      monthlyPuLimit: new Decimal(20000),
      priceMonthlyRub: new Decimal(149900),
      overagePuPriceRub: new Decimal(8),
      overageDialogPriceRub: new Decimal(3),
      features: [
        { text: '20,000 Единиц обработки в месяц', included: true },
        { text: '• 4,000 документов', included: true },
        { text: '• 20,000 диалогов', included: true },
        { text: 'Выделенный менеджер', included: true },
        { text: 'SLA гарантии', included: true },
        { text: 'Полный API доступ', included: true },
      ],
      stripePriceId: null,
      displayOrder: 4,
    },
  ]

  console.log('Seeding subscription plans...')

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        monthlyPuLimit: plan.monthlyPuLimit,
        priceMonthlyRub: plan.priceMonthlyRub,
        overagePuPriceRub: plan.overagePuPriceRub,
        overageDialogPriceRub: plan.overageDialogPriceRub,
        features: plan.features,
        stripePriceId: plan.stripePriceId,
        displayOrder: plan.displayOrder,
      },
      create: {
        code: plan.code,
        name: plan.name,
        monthlyPuLimit: plan.monthlyPuLimit,
        priceMonthlyRub: plan.priceMonthlyRub,
        overagePuPriceRub: plan.overagePuPriceRub,
        overageDialogPriceRub: plan.overageDialogPriceRub,
        features: plan.features,
        stripePriceId: plan.stripePriceId,
        isActive: true,
        displayOrder: plan.displayOrder,
      },
    })

    console.log(`✅ Upserted plan: ${created.code} (${created.name})`)
  }

  console.log('✅ Subscription plans seeded successfully!')
}

async function main() {
  try {
    await seedSubscriptionPlans()
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
