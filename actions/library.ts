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
        error?: string
    } | null
    status: string
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

export async function uploadLibraryDocument(data: {
    file: FormData
}) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    const file = data.file.get('file') as File
    if (!file) throw new Error("File not found")

    const filename = file.name
    const fileSize = file.size
    const mimeType = file.type || 'application/octet-stream'

    try {
        // Create PENDING record immediately
        const pendingItem = await prisma.libraryItem.create({
            data: {
                userId: user.id,
                name: filename,
                type: 'FILE',
                fileSize,
                mimeType,
                status: 'PENDING' as any
            }
        })

        // Read file content
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Background processing
        processLibraryItemAsync(user.id, pendingItem.id, filename, fileSize, mimeType, { buffer })
            .catch(err => console.error("[LibraryAsync] Failed:", err))

        return { success: true, status: 'processing', id: pendingItem.id }

    } catch (error) {
        console.error("Library upload failed:", error)
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" }
    }
}

async function processLibraryItemAsync(
    userId: string,
    itemId: string,
    filename: string,
    fileSize: number,
    mimeType: string,
    data: { buffer?: Buffer; text?: string }
) {
    try {
        console.log(`[LibraryAsync] Starting for ${filename} (${itemId})`)
        const gatewayUrl = process.env.AI_GATEWAY_URL
        if (!gatewayUrl) throw new Error("AI Gateway not configured")

        let chunks: any[] = []
        let textContent = ""

        if (data.buffer) {
            const parseFormData = new FormData()
            const blob = new Blob([data.buffer.buffer as ArrayBuffer], { type: mimeType })
            parseFormData.append('file', blob, filename)

            const parseResponse = await fetch(`${gatewayUrl}/api/v1/documents/parse`, {
                method: 'POST',
                body: parseFormData,
            })

            if (!parseResponse.ok) throw new Error("Failed to parse document")

            const parseData = await parseResponse.json()
            chunks = (parseData.chunks || []).map((chunk: any, index: number) => ({
                content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
                index
            }))
            textContent = chunks.map((c: any) => c.content).join('\n\n')
        } else if (data.text) {
            textContent = data.text
            const size = 2000
            for (let i = 0; i < textContent.length; i += size) {
                chunks.push({
                    content: textContent.slice(i, i + size),
                    index: Math.floor(i / size)
                })
            }
        }

        const contentTokens = Math.ceil(textContent.length / 4)
        const billing = await getBillingSystem(userId)

        // Calculate Charge
        const charge = await calculateFileCharge(
            `user-${userId}`,
            filename,
            Buffer.from(textContent),
            contentTokens
        )

        const hasBalance = await billing.checkBalance(userId, charge.puCost)
        if (!hasBalance) throw new Error(`Недостаточно PU. Требуется: ${charge.puCost.toFixed(2)} PU`)

        // Deduct Usage
        if (charge.puCost > 0) {
            await billing.deductUsage(userId, charge.puCost, {
                source: 'FILE_UPLOAD',
                description: `Загрузка в библиотеку: ${filename}`,
                metadata: {
                    libraryItemId: itemId,
                    fileName: filename,
                    chargeReason: charge.reason,
                    chargePercentage: charge.chargePercentage
                }
            })
        }

        // Vectorize & Update existing record
        // The Gateway's vectorize endpoint for agents creates a KnowledgeBase record.
        // For LibraryItems, we don't have a direct Gateway endpoint that updates LibraryItem.
        // However, we can use the same logic: Gateway only returns vectorized status or we do it here.
        // Actually, the LibraryItem needs the chunks in DB.

        await prisma.$transaction([
            prisma.libraryChunk.deleteMany({ where: { libraryItemId: itemId } }),
            prisma.libraryChunk.createMany({
                data: chunks.map(c => ({
                    libraryItemId: itemId,
                    content: c.content,
                    chunkIndex: c.index,
                    metadata: {}
                }))
            }),
            prisma.libraryItem.update({
                where: { id: itemId },
                data: {
                    content: textContent,
                    status: 'VECTORIZED' as any as any
                }
            })
        ])

        // Save Cache
        const contentHash = crypto.createHash('sha256').update(textContent).digest('hex')
        await saveFileProcessingCache(
            `user-${userId}`,
            filename,
            contentHash,
            fileSize,
            chunks.length,
            charge.puCost,
            charge.chargePercentage
        )

        console.log(`[LibraryAsync] Completed successfully for ${filename}`)

        // Auto-generate metadata
        try {
            const { generateDocumentMetadata } = await import('@/actions/agent-knowledge')
            await generateDocumentMetadata(userId, itemId, filename, textContent, true)
        } catch (metaErr) {
            console.warn(`[LibraryAsync] Metadata generation failed for ${filename}:`, metaErr)
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[LibraryAsync] Failed for ${filename}:`, error)
        await prisma.libraryItem.update({
            where: { id: itemId },
            data: {
                status: 'ERROR',
                aiMetadata: { error: errorMsg }
            }
        }).catch(() => { })
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
                status: 'VECTORIZED', // Legacy sync created items are ready immediately
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
        return { success: false, error: String(error) }
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

// Cleanup stale PENDING library items older than 30 minutes
export async function cleanupStalePendingLibraryItems() {
    const user = await getCurrentUser()
    if (!user || !user.id) return { cleaned: 0 }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    try {
        const result = await prisma.libraryItem.updateMany({
            where: {
                userId: user.id,
                status: 'PENDING',
                createdAt: { lt: thirtyMinutesAgo }
            },
            data: { status: 'ERROR' }
        })

        if (result.count > 0) {
            console.log(`[Cleanup] Marked ${result.count} stale PENDING library items as ERROR`)
        }

        return { cleaned: result.count }
    } catch (error) {
        console.error("[LibraryCleanup] Failed:", error)
        return { cleaned: 0 }
    }
}

// Async website scraping for global library
export async function asyncScrapeLibraryWebsite(url: string) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    try {
        // Create PENDING record immediately
        const pendingItem = await prisma.libraryItem.create({
            data: {
                userId: user.id,
                name: url,
                type: 'FILE',
                mimeType: 'text/html',
                status: 'PENDING'
            }
        })

        // Background task: scrape -> process
        const runScrapeAndProcess = async () => {
            try {
                const { runApifyCrawler } = await import("@/lib/apify")
                const items = await runApifyCrawler(url)

                if (!items || items.length === 0) throw new Error("Scraping returned no results")

                const combinedText = items
                    .map((item: any) => item.text || item.markdown || "")
                    .filter((t: string) => t.length > 0)
                    .join("\n\n---\n\n")

                if (combinedText.length === 0) throw new Error("Scraped content is empty")

                const title = items[0]?.metadata?.title || items[0]?.title || url

                // Update pending item title
                await prisma.libraryItem.update({
                    where: { id: pendingItem.id },
                    data: { name: title }
                })

                await processLibraryItemAsync(
                    user.id!,
                    pendingItem.id,
                    title,
                    combinedText.length,
                    'text/plain',
                    { text: combinedText }
                )
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                console.error(`[LibraryScrape] Failed for ${url}:`, err)
                await prisma.libraryItem.update({
                    where: { id: pendingItem.id },
                    data: { status: 'ERROR', aiMetadata: { error: errorMsg } }
                }).catch(() => { })
            }
        }

        runScrapeAndProcess().catch(err => console.error("Library scrape background failed:", err))

        return { success: true, status: 'processing', id: pendingItem.id }

    } catch (error) {
        console.error("Library async scrape failed:", error)
        return { success: false, error: error instanceof Error ? error.message : "Scrape failed" }
    }
}
