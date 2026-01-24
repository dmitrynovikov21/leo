"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Helper to find chunk
async function findChunk(fileId: string, snippet: string) {
    // 1. Try KnowledgeBase
    const kb = await prisma.knowledgeBase.findUnique({
        where: { id: fileId },
        include: { chunks: true }
    })

    if (kb && kb.chunks) {
        // Try exact match first
        let chunk = kb.chunks.find(c => c.content.includes(snippet))
        // If not found, try normalized match (ignore extra whitespace)
        if (!chunk) {
            const normalizedSnippet = snippet.replace(/\s+/g, ' ').trim()
            chunk = kb.chunks.find(c => c.content.replace(/\s+/g, ' ').includes(normalizedSnippet))
        }
        if (chunk) return { type: 'kb', chunk }
    }

    // 2. Try LibraryItem
    const item = await prisma.libraryItem.findUnique({
        where: { id: fileId },
        include: { chunks: true }
    })

    if (item && item.chunks) {
        let chunk = item.chunks.find(c => c.content.includes(snippet))
        if (!chunk) {
            const normalizedSnippet = snippet.replace(/\s+/g, ' ').trim()
            chunk = item.chunks.find(c => c.content.replace(/\s+/g, ' ').includes(normalizedSnippet))
        }
        if (chunk) return { type: 'lib', chunk }
    }

    return null
}

export async function getChunkForConflict(fileId: string, snippet: string) {
    try {
        const result = await findChunk(fileId, snippet)
        if (result) {
            return { success: true, chunkId: result.chunk.id, content: result.chunk.content }
        }
        return { success: false, error: "Чанк с таким текстом не найден" }
    } catch (error) {
        console.error("Error finding chunk:", error)
        return { success: false, error: "Ошибка поиска чанка" }
    }
}

export async function updateChunkContent(chunkId: string, newContent: string, conflictId: string) {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    try {
        // We don't know if it's KB or Library chunk, try updating both (IDs should be unique across tables usually? No, UUIDs are unique globally)
        // Actually, we can try to update DocumentChunk first, catch error, then LibraryChunk.
        // Prisma `update` throws if ID not found.

        // Find out which table it belongs to?
        // We can just try findUnique on both.

        const isKbChunk = await prisma.documentChunk.findUnique({ where: { id: chunkId } })
        let updated = false

        if (isKbChunk) {
            await prisma.documentChunk.update({
                where: { id: chunkId },
                data: { content: newContent }
            })
            updated = true
        } else {
            const isLibChunk = await prisma.libraryChunk.findUnique({ where: { id: chunkId } })
            if (isLibChunk) {
                await prisma.libraryChunk.update({
                    where: { id: chunkId },
                    data: { content: newContent }
                })
                updated = true
            }
        }

        if (!updated) {
            return { success: false, error: "Чанк не найден" }
        }

        // Resolve conflict
        await prisma.knowledgeConflict.update({
            where: { id: conflictId },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date()
            }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update chunk:", error)
        return { success: false, error: "Ошибка сохранения" }
    }
}

export async function updateConflictStatus(conflictId: string, status: "RESOLVED" | "IGNORED") {
    try {
        await prisma.knowledgeConflict.update({
            where: { id: conflictId },
            data: {
                status: status,
                resolvedAt: status === "RESOLVED" ? new Date() : null
            }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update status" }
    }
}
