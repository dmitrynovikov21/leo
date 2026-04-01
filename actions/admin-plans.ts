'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin only')
  }
  return session
}

export async function getPlans() {
  await requireAdmin()

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { displayOrder: 'asc' },
  })

  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    monthlyPuLimit: parseFloat(p.monthlyPuLimit.toString()),
    priceMonthlyRub: parseFloat(p.priceMonthlyRub.toString()),
    overagePuPriceRub: parseFloat(p.overagePuPriceRub.toString()),
    overageDialogPriceRub: parseFloat(p.overageDialogPriceRub.toString()),
    features: p.features as string[],
    isActive: p.isActive,
    displayOrder: p.displayOrder,
    stripePriceId: p.stripePriceId,
    usersCount: 0, // will fill below
  }))
}

export async function getPlansWithStats() {
  await requireAdmin()

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: { select: { users: true } },
    },
  })

  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    monthlyPuLimit: parseFloat(p.monthlyPuLimit.toString()),
    priceMonthlyRub: parseFloat(p.priceMonthlyRub.toString()),
    overagePuPriceRub: parseFloat(p.overagePuPriceRub.toString()),
    overageDialogPriceRub: parseFloat(p.overageDialogPriceRub.toString()),
    features: p.features as string[],
    isActive: p.isActive,
    displayOrder: p.displayOrder,
    stripePriceId: p.stripePriceId,
    usersCount: p._count.users,
  }))
}

export async function upsertPlan(data: {
  id?: string
  code: string
  name: string
  monthlyPuLimit: number
  priceMonthlyRub: number
  overagePuPriceRub: number
  overageDialogPriceRub: number
  features: string[]
  isActive: boolean
  displayOrder: number
}) {
  await requireAdmin()

  if (data.id) {
    await prisma.subscriptionPlan.update({
      where: { id: data.id },
      data: {
        code: data.code,
        name: data.name,
        monthlyPuLimit: data.monthlyPuLimit,
        priceMonthlyRub: data.priceMonthlyRub,
        overagePuPriceRub: data.overagePuPriceRub,
        overageDialogPriceRub: data.overageDialogPriceRub,
        features: data.features,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
      },
    })
  } else {
    await prisma.subscriptionPlan.create({
      data: {
        code: data.code,
        name: data.name,
        monthlyPuLimit: data.monthlyPuLimit,
        priceMonthlyRub: data.priceMonthlyRub,
        overagePuPriceRub: data.overagePuPriceRub,
        overageDialogPriceRub: data.overageDialogPriceRub,
        features: data.features,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
      },
    })
  }

  revalidatePath('/admin/plans')
  return { success: true }
}

export async function deletePlan(id: string) {
  await requireAdmin()

  // Check if any users are on this plan
  const usersCount = await prisma.userSubscription.count({
    where: { planId: id },
  })

  if (usersCount > 0) {
    return { success: false, error: `На этом тарифе ${usersCount} пользователей. Сначала переведите их на другой тариф.` }
  }

  await prisma.subscriptionPlan.delete({ where: { id } })

  revalidatePath('/admin/plans')
  return { success: true }
}
