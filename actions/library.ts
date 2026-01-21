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

export async function getLibraryItems(options?: { search?: string }): Promise<LibraryItemWithChunks[]> {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const whereClause: any = {
            userId: user.id
        }

        // Add search filter if provided
        if (options?.search && options.search.trim().length > 0) {
            const searchTerm = options.search.trim()
            whereClause.OR = [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { content: { contains: searchTerm, mode: 'insensitive' } }
            ]
        }

        const items = await prisma.libraryItem.findMany({
            where: whereClause,
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
    } catch (error) {
        console.error('[getLibraryItems] Database error:', error)

        // DEV MODE: Return empty array when DB unavailable
        if (process.env.NODE_ENV === 'development') {
            console.warn('[getLibraryItems] Returning empty array for dev mode')
            return []
        }

        throw error
    }
}

// Helper to ensure dev user exists in DB to prevent FK errors
async function ensureDevUser(id: string) {
    if (id === 'dev-user-id' && process.env.NODE_ENV === 'development') {
        try {
            // 1. Check if user already exists with the correct ID
            const exists = await prisma.user.findUnique({ where: { id } })
            if (exists) return

            // 2. Check if email is taken by another ID (conflict)
            const conflict = await prisma.user.findUnique({ where: { email: 'dev@test.com' } })
            if (conflict) {
                console.log('[ensureDevUser] Renaming conflicting dev user:', conflict.id)
                // Rename instead of delete to avoid cascade complexity
                await prisma.user.update({
                    where: { email: 'dev@test.com' },
                    data: { email: `dev-conflict-${Date.now()}@test.com` }
                })
            }

            // 3. Create the user with the session ID
            console.log('[ensureDevUser] Creating dev user in DB')
            await prisma.user.create({
                data: {
                    id,
                    email: 'dev@test.com',
                    name: 'Dev User',
                    password: 'devtest123',
                    emailVerified: new Date()
                }
            })
        } catch (error) {
            console.error('[ensureDevUser] Failed:', error)
            throw error
        }
    }
}

export async function clearLibrary() {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    try {
        await prisma.libraryItem.deleteMany({
            where: { userId: user.id }
        })
        revalidatePath('/dashboard/knowledge')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to clear library" }
    }
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
    if (!user || !user.id) throw new Error("Unauthorized")

    await ensureDevUser(user.id)

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
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error("Failed to create library item:", errorMessage)
        return { success: false, error: `DB Error: ${errorMessage}` }
    }
}

export async function deleteLibraryItem(id: string) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

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
    if (!user || !user.id) throw new Error("Unauthorized")

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
    if (!user || !user.id) throw new Error("Unauthorized")

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

export async function updateLibraryItem(id: string, data: { name: string; content: string }) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    await ensureDevUser(user.id)

    try {
        // First verify ownership
        const existing = await prisma.libraryItem.findUnique({ where: { id } })
        if (!existing || existing.userId !== user.id) {
            return { success: false, error: "Item not found or unauthorized" }
        }

        // Update the main item
        const item = await prisma.libraryItem.update({
            where: { id },
            data: {
                name: data.name,
                content: data.content
            }
        })

        // For notes, we also need to update the chunk
        // In this MVP, we assume notes have 1 chunk. We'll update all chunks attached to this item to the new content
        // or just the first one. Let's update all to be safe or delete and recreate.
        // Safer: delete all chunks and recreate one.
        await prisma.libraryChunk.deleteMany({
            where: { libraryItemId: id }
        })

        await prisma.libraryChunk.create({
            data: {
                libraryItemId: id,
                content: data.content,
                chunkIndex: 0,
                metadata: { type: 'note_segment', updated: true }
            }
        })

        revalidatePath('/dashboard/knowledge')
        return { success: true, item }
    } catch (error) {
        console.error("Failed to update library item:", error)
        return { success: false, error: "Failed to update item" }
    }
}
