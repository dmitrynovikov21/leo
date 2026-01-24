"use server"

import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/db"

export async function getAgentDocuments(agentId: string) {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const docs = await prisma.knowledgeBase.findMany({
            where: {
                agentId: agentId,
                // userId check? Agent belongs to user?
                // The schema has agent.userId. We can enforce access check.
                agent: {
                    userId: user.id
                }
            },
            include: {
                _count: {
                    select: { chunks: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return docs.map(doc => ({
            id: doc.id,
            name: doc.filename,
            type: doc.mimeType, // View will need to handle raw mime type
            size: doc.fileSize,
            chunksCount: doc._count.chunks,
            tokensUsage: doc._count.chunks * 500, // Estimate
            status: doc.status.toLowerCase(), // 'VECTORIZED' -> 'vectorized'
            updatedAt: doc.updatedAt,
            aiMetadata: doc.aiMetadata,
            createdAt: doc.createdAt
        }))
    } catch (error) {
        console.error("Failed to fetch agent documents:", error)
        return []
    }
}
