'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getBillingSystem } from '@/lib/billing-adapter'

export async function getAllSubscriptionPlans() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return []
    }

    const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' }
    })

    return plans.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name
    }))
}

export async function updateUserSubscriptionPlan(userId: string, planId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        throw new Error("Unauthorized")
    }

    try {
        // Ensure billing system setup (creates sub if missing)
        await getBillingSystem(userId)

        // Find the subscription
        const sub = await prisma.userSubscription.findUnique({
            where: { userId }
        })

        if (!sub) {
            throw new Error("Subscription not found even after init")
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        })

        if (!plan) throw new Error("Plan not found")

        // Update plan details
        // Note: Changing plan mid-cycle might require complex pro-ration logic.
        // For now, we just switch the plan and the limit. 
        // We do NOT reset the cycle dates unless requested.
        await prisma.userSubscription.update({
            where: { userId },
            data: {
                planId: plan.id,
                puLimit: plan.monthlyPuLimit,
                // Optionally update balance?
                // If upgrading, maybe add difference? 
                // Let's keep it simple: just switch plan pointer and limit.
                // The balance remains as is until next reset or manual topup
            }
        })

        revalidatePath('/admin/users-balance')
        return { success: true }
    } catch (error) {
        console.error("Failed to update user subscription:", error)
        return { success: false, error: error instanceof Error ? error.message : "Update failed" }
    }
}
