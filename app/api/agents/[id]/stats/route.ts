import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const agentId = params.id

        // Verify agent belongs to user
        const agent = await prisma.agent.findUnique({
            where: {
                id: agentId,
                userId: session.user.id
            }
        })

        if (!agent) {
            return new NextResponse("Not Found", { status: 404 })
        }

        // 1. Total Dialogs (Unique users who talked to this agent)
        const dialogs = await prisma.agentMessage.groupBy({
            by: ['telegramUserId'],
            where: {
                agentId: agentId
            }
        })
        const totalDialogs = dialogs.length

        // 2. Today's Dialogs
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const todayDialogsGroup = await prisma.agentMessage.groupBy({
            by: ['telegramUserId'],
            where: {
                agentId: agentId,
                createdAt: {
                    gte: startOfToday
                }
            }
        })
        const todayDialogs = todayDialogsGroup.length

        // 3. Token Usage & Avg Response Time
        const tokenStats = await prisma.tokenUsage.aggregate({
            _sum: {
                totalTokens: true
            },
            _avg: {
                responseTimeMs: true
            },
            where: {
                agentId: agentId
            }
        })

        const totalTokens = tokenStats._sum.totalTokens || 0
        const avgResponseTimeMs = Math.round(tokenStats._avg.responseTimeMs || 0)

        // Return stats
        return NextResponse.json({
            totalDialogs,
            todayDialogs,
            totalTokens,
            avgResponseTimeMs
        })

    } catch (error) {
        console.error("[AGENT_STATS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
