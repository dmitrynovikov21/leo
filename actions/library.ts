"use server"

import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface LibraryItemWithChunks {
    id: string
    name: string
    type: string
    content: string | null
    fileUrl: string | null
    fileSize: number | null
    mimeType: string | null
    createdAt: Date
    _count: {
        chunks: number
    }
}

export async function getLibraryItems(): Promise<LibraryItemWithChunks[]> {
    const user = await getCurrentUser()
    if (!user) return []

    const items = await prisma.libraryItem.findMany({
        where: {
            userId: user.id
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

    return items as LibraryItemWithChunks[]
}

export async function createLibraryItem(data: {
    name: string
    type: 'FILE' | 'NOTE'
    content?: string
    fileUrl?: string
    fileSize?: number
    mimeType?: string
    chunks: { content: string; index: number; metadata?: any }[]
}) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    try {
        const item = await prisma.libraryItem.create({
            data: {
                userId: user.id,
                name: data.name,
                type: data.type,
                content: data.content,
                fileUrl: data.fileUrl,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                chunks: {
                    create: data.chunks.map(chunk => ({
                        content: chunk.content,
                        chunkIndex: chunk.index,
                        metadata: chunk.metadata || {}
                    }))
                }
            }
        })

        revalidatePath('/dashboard/knowledge')
        return { success: true, item }
    } catch (error) {
        console.error("Failed to create library item:", error)
        return { success: false, error: "Failed to save to library" }
    }
}

export async function deleteLibraryItem(id: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    try {
        await prisma.libraryItem.delete({
            where: {
                id,
                userId: user.id
            }
        })

        revalidatePath('/dashboard/knowledge')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete item" }
    }
}

export async function getLibraryItemChunks(id: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const item = await prisma.libraryItem.findUnique({
        where: { id, userId: user.id },
        include: {
            chunks: {
                orderBy: { chunkIndex: 'asc' }
            }
        }
    })

    if (!item) return null

    return item.chunks
}

export async function updateLibraryChunk(chunkId: string, content: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    try {
        // Verify ownership through library item
        const chunk = await prisma.libraryChunk.findUnique({
            where: { id: chunkId },
            include: {
                libraryItem: {
                    select: { userId: true }
                }
            }
        })

        if (!chunk || chunk.libraryItem.userId !== user.id) {
            return { success: false, error: "Chunk not found" }
        }

        await prisma.libraryChunk.update({
            where: { id: chunkId },
            data: { content }
        })

        revalidatePath('/dashboard/knowledge')
        return { success: true }
    } catch (error) {
        console.error("Failed to update chunk:", error)
        return { success: false, error: "Failed to update chunk" }
    }
}
