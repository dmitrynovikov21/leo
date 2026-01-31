"use server"

import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { calculateFileCharge, saveFileProcessingCache } from "@/lib/file-charging"
import { getBillingSystem } from "@/lib/billing-adapter"
import crypto from "crypto"

export interface LibraryItemWithChunks {
    id: string
    name: string
    type: string
    content: string | null
    fileUrl: string | null
    fileSize: number | null
    mimeType: string | null
    aiMetadata: {
        ai_title?: string
        category?: string
        summary?: string
        utility?: string
        topics?: string[]
    } | null
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

        return items.map((item: any) => ({
            ...item,
            aiMetadata: item.aiMetadata ?? null
        })) as LibraryItemWithChunks[]
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
        // Get billing system for user
        const billing = await getBillingSystem(user.id)

        // For FILES, calculate smart charging cost
        let puCost = 0
        let chargeInfo: any = null

        if (data.type === 'FILE' && data.content) {
            try {
                // Calculate file charge (duplicate, version, new file, etc.)
                const content = Buffer.from(data.content)
                const contentTokens = Math.ceil(data.content.length / 4) // Rough estimation

                const charge = await calculateFileCharge(
                    `user-${user.id}`, // Use userId as "agentId" for library
                    data.name,
                    content,
                    contentTokens
                )

                puCost = charge.puCost
                chargeInfo = charge

                // Check balance before proceeding
                const hasBalance = await billing.checkBalance(user.id, puCost)
                if (!hasBalance) {
                    return {
                        success: false,
                        error: `Недостаточно PU. Требуется: ${puCost.toFixed(4)} PU`,
                        requiredPu: puCost
                    }
                }
            } catch (chargeError) {
                console.warn('[createLibraryItem] Charge calculation failed, proceeding without cost:', chargeError)
                puCost = 0 // Continue without charge if calculation fails
            }
        }

        // Create library item
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

        // Deduct PU if applicable
        if (puCost > 0 && data.type === 'FILE') {
            try {
                // Calculate content hash for caching
                const contentHash = crypto
                    .createHash('sha256')
                    .update(data.content || '')
                    .digest('hex')

                // Deduct PU from user balance
                await billing.deductUsage(user.id, puCost, {
                    source: 'FILE_UPLOAD',
                    description: `Загрузка файла: ${data.name}`,
                    metadata: {
                        libraryItemId: item.id,
                        fileName: data.name,
                        fileSize: data.fileSize,
                        chargeReason: chargeInfo?.reason,
                        chargePercentage: chargeInfo?.chargePercentage,
                    }
                })

                // Save to file processing cache
                await saveFileProcessingCache(
                    `user-${user.id}`,
                    data.name,
                    contentHash,
                    data.fileSize || 0,
                    data.chunks.length,
                    puCost,
                    chargeInfo?.chargePercentage || 100
                )
            } catch (deductError) {
                console.error('[createLibraryItem] PU deduction failed:', deductError)
                // Note: Item was already created, but charge failed
                // In production, might want to rollback or notify admin
            }
        }

        revalidatePath('/dashboard/knowledge')
        return {
            success: true,
            item,
            puCharged: puCost,
            chargeInfo
        }
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
