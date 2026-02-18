
// Mock server-only to avoid errors in CLI
import { Module } from 'module'
const originalRequire = Module.prototype.require
// @ts-ignore
Module.prototype.require = function (id) {
    if (id === 'server-only') {
        return {}
    }
    // @ts-ignore
    return originalRequire.call(this, id)
}

import { dailyCycleResetJob, handleSubscriptionFailure } from '../lib/subscription-manager'
import { prisma } from '../lib/db'
import assert from 'assert'
import { v4 as uuidv4 } from 'uuid'
import { Decimal } from '@prisma/client/runtime/library'

async function run() {
    console.log('Testing Manual Subscription Expiration...')

    // 1. Create a test user with a manual subscription that "expired" yesterday
    const userId = `test-user-${uuidv4()}`

    // Create user
    await prisma.user.create({
        data: { id: userId, email: `${userId}@example.com` }
    })

    // Get a plan
    const plan = await prisma.subscriptionPlan.findFirst()
    if (!plan) throw new Error('No plans found')

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    // Create expired manual subscription (no stripeId)
    await prisma.userSubscription.create({
        data: {
            userId,
            planId: plan.id,
            status: 'ACTIVE',
            billingCycleStartDate: new Date('2025-01-01'),
            nextResetDate: yesterday, // Expired
            puLimit: new Decimal(100),
            puBalance: new Decimal(100),
            stripeSubscriptionId: null // Manual
        }
    })

    console.log(`Created test user ${userId} with expired manual subscription.`)

    // 2. Run the Cron Job logic
    console.log('Running dailyCycleResetJob...')
    await dailyCycleResetJob()

    // 3. Verify status changed to PAST_DUE
    const updatedSub = await prisma.userSubscription.findUnique({ where: { userId } })

    console.log('Updated Status:', updatedSub?.status)

    assert.strictEqual(updatedSub?.status, 'PAST_DUE', 'Subscription should be PAST_DUE')

    // 4. Cleanup
    await prisma.user.delete({ where: { id: userId } })
    console.log('Test Passed & Cleanup Done.')
}

run().catch(console.error)
