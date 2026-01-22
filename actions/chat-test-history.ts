"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/auth"

interface Message {
    id: number
    role: 'user' | 'assistant'
    text: string
    feedback: 'like' | 'dislike' | null
}

// Save chat session to history
export async function saveChatTestHistory(
    agentId: string,
    messages: Message[],
    sessionId?: string | null
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        // Verify agent belongs to user
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId: session.user.id }
        })

        if (!agent) {
            return { success: false, error: "Agent not found" }
        }

        // Create history entry
        const history = await prisma.chatTestHistory.create({
            data: {
                agentId,
                sessionId: sessionId || null,
                messages: JSON.parse(JSON.stringify(messages)), // Ensure it's plain JSON
                messageCount: messages.length,
            }
        })

        return { success: true, id: history.id }
    } catch (error) {
        console.error("Error saving chat test history:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save history"
        }
    }
}

// Get chat test history for agent
export async function getChatTestHistory(agentId: string, limit: number = 50) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return []
        }

        // Verify agent belongs to user
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, userId: session.user.id }
        })

        if (!agent) {
            return []
        }

        const history = await prisma.chatTestHistory.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                sessionId: true,
                messageCount: true,
                createdAt: true,
            }
        })

        return history
    } catch (error) {
        console.error("Error fetching chat test history:", error)
        return []
    }
}

// Get single history entry with messages
export async function getChatTestHistoryById(historyId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return null
        }

        const history = await prisma.chatTestHistory.findFirst({
            where: { id: historyId },
            include: {
                agent: {
                    select: { userId: true }
                }
            }
        })

        if (!history || history.agent.userId !== session.user.id) {
            return null
        }

        return {
            id: history.id,
            sessionId: history.sessionId,
            messages: history.messages as unknown as Message[],
            messageCount: history.messageCount,
            createdAt: history.createdAt,
        }
    } catch (error) {
        console.error("Error fetching chat test history by id:", error)
        return null
    }
}

// Delete history entry
export async function deleteChatTestHistory(historyId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" }
        }

        const history = await prisma.chatTestHistory.findFirst({
            where: { id: historyId },
            include: {
                agent: {
                    select: { userId: true }
                }
            }
        })

        if (!history || history.agent.userId !== session.user.id) {
            return { success: false, error: "Not found" }
        }

        await prisma.chatTestHistory.delete({
            where: { id: historyId }
        })

        return { success: true }
    } catch (error) {
        console.error("Error deleting chat test history:", error)
        return { success: false, error: "Failed to delete" }
    }
}
