'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export interface UserStat {
    id: string
    name: string | null
    email: string | null
    agentsCount: number
    dialogsCount: number
    createdAt: Date
}

export async function getAdminUserStats(limit = 50, offset = 0, search?: string) {
    const session = await auth()

    if (session?.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const where = search ? {
        OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } }
        ]
    } : {}

    // fetch users
    const users = await prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
                select: { agents: true }
            },
            agents: {
                select: {
                    id: true
                }
            }
        }
    })

    // calculate dialogs count
    // This is expensive if we do it for every user naiveley.
    // Optimization: Fetch aggregated message stats for these agents.

    const userStats: UserStat[] = []

    for (const user of users) {
        let dialogsCount = 0

        if (user.agents.length > 0) {
            const agentIds = user.agents.map(a => a.id)

            // aggregations
            const dialogs = await prisma.agentMessage.groupBy({
                by: ['agentId', 'telegramUserId'],
                where: {
                    agentId: { in: agentIds }
                },
                _count: {
                    _all: true
                }
            })

            dialogsCount = dialogs.length
        }

        userStats.push({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            agentsCount: user._count.agents,
            dialogsCount
        })
    }

    return userStats
}
