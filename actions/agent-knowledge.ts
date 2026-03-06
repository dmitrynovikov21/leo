"use server"

import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { calculateFileCharge, saveFileProcessingCache } from "@/lib/file-charging"
import { getBillingSystem } from "@/lib/billing-adapter"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { getActivePromptContent } from "@/actions/system-prompts"
import { trackTokenUsage } from "@/lib/token-tracking"
import { aiFetch, getGatewayUrl } from "@/lib/ai-fetch"

export async function getAgentDocuments(agentId: string) {
    const user = await getCurrentUser()
    if (!user) return []

    try {
        const docs = await prisma.knowledgeBase.findMany({
            where: {
                agentId: agentId,
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
            type: doc.mimeType,
            size: doc.fileSize,
            chunksCount: doc._count.chunks,
            tokensUsage: doc._count.chunks * 500, // Estimate
            status: doc.status.toLowerCase(),
            updatedAt: doc.updatedAt,
            aiMetadata: doc.aiMetadata as any,
            createdAt: doc.createdAt
        }))
    } catch (error) {
        console.error("Failed to fetch agent documents:", error)
        return []
    }
}

export async function uploadAgentDocument(data: {
    agentId: string
    file: FormData
}) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    const file = data.file.get('file') as File
    if (!file) throw new Error("File not found")

    const agentId = data.agentId
    const filename = file.name
    const fileSize = file.size
    const mimeType = file.type || 'application/octet-stream'

    // 1. Verify ownership
    const agent = await prisma.agent.findUnique({
        where: { id: agentId, userId: user.id }
    })
    if (!agent) throw new Error("Agent not found or unauthorized")

    try {
        // Create PENDING record immediately
        const pendingDoc = await prisma.knowledgeBase.create({
            data: {
                agentId,
                filename,
                fileSize,
                mimeType,
                status: 'PENDING',
                chunks: { create: [] } // No chunks yet
            }
        })

        // Read file content to buffer before request closes
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Fire and forget processing
        processDocumentAsync(user.id, agentId, pendingDoc.id, filename, fileSize, mimeType, { buffer })
            .catch(err => console.error("Background processing failed:", err))

        // No revalidatePath — frontend polls for pending docs every 3s
        return { success: true, status: 'processing', id: pendingDoc.id }

    } catch (error) {
        console.error("Upload agent document failed:", error)
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" }
    }
}

// Background processing function
async function processDocumentAsync(
    userId: string,
    agentId: string,
    pendingDocId: string,
    filename: string, // URL for website
    fileSize: number, // Estimate for website
    mimeType: string,
    data: { buffer?: Buffer; text?: string } // Reusable for both
) {
    try {
        console.log(`[AsyncUpload] Starting processing for ${filename} (${pendingDocId})`)
        const gatewayUrl = getGatewayUrl()
        if (!gatewayUrl) throw new Error("AI Gateway not configured")

        let chunks: any[] = []
        let textContent = ""

        // Case 1: We have a Buffer (File) -> Need to Parse
        if (data.buffer) {
            const parseFormData = new FormData()
            // Convert Buffer to BlobPart compatible format
            const blob = new Blob([data.buffer.buffer as ArrayBuffer], { type: mimeType })
            parseFormData.append('file', blob, filename)

            const parseResponse = await aiFetch(`${gatewayUrl}/api/v1/documents/parse`, {
                method: 'POST',
                body: parseFormData,
            })

            if (!parseResponse.ok) throw new Error("Failed to parse document")

            const parseData = await parseResponse.json()
            chunks = (parseData.chunks || []).map((chunk: any, index: number) => ({
                content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
                index
            }))
            // Capture fullText from parse response for contextual retrieval
            textContent = parseData.fullText || chunks.map((c: any) => c.content).join('\n\n')
        }
        // Case 2: We have Text (Website scraped content) -> Parse via gateway for smart chunking
        else if (data.text) {
            textContent = data.text

            // Use gateway /parse endpoint instead of dumb 2000-char split
            try {
                const textBlob = new Blob([Buffer.from(textContent, 'utf-8')], { type: 'text/plain' })
                const textFormData = new FormData()
                textFormData.append('file', textBlob, filename || 'website-content.txt')

                const textParseResponse = await aiFetch(`${gatewayUrl}/api/v1/documents/parse`, {
                    method: 'POST',
                    body: textFormData,
                })

                if (textParseResponse.ok) {
                    const textParseData = await textParseResponse.json()
                    chunks = (textParseData.chunks || []).map((chunk: any, index: number) => ({
                        content: typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '',
                        index
                    }))
                    textContent = textParseData.fullText || textContent
                } else {
                    throw new Error('Gateway parse failed for text')
                }
            } catch (parseErr) {
                console.warn(`[AsyncUpload] Gateway parse failed for text, falling back to simple split:`, parseErr)
                // Fallback to simple chunking
                const size = 2000
                for (let i = 0; i < textContent.length; i += size) {
                    chunks.push({
                        content: textContent.slice(i, i + size),
                        index: Math.floor(i / size)
                    })
                }
            }
        } else {
            throw new Error("No data provided for processing")
        }

        const contentTokens = Math.ceil(textContent.length / 4) // Rough
        console.log(`[AsyncUpload] Prepared ${chunks.length} chunks`)

        // 3. Calculate Charge
        const charge = await calculateFileCharge(
            agentId,
            filename,
            Buffer.from(textContent),
            contentTokens
        )

        // 4. Check & Deduct Balance
        const billing = await getBillingSystem(userId)
        const hasBalance = await billing.checkBalance(userId, charge.puCost)

        if (!hasBalance) {
            throw new Error(`Недостаточно PU. Требуется: ${charge.puCost.toFixed(2)} PU`)
        }

        if (charge.puCost > 0) {
            await billing.deductUsage(userId, charge.puCost, {
                source: 'FILE_UPLOAD',
                description: `Загрузка в базу знаний: ${filename}`,
                metadata: {
                    agentId,
                    fileName: filename,
                    chargeReason: charge.reason,
                    chargePercentage: charge.chargePercentage
                }
            })
        }

        // 5. Vectorize (Save) via Gateway (with fullText for contextual enrichment)
        const vectorizeResponse = await aiFetch(`${gatewayUrl}/api/v1/documents/vectorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId,
                userId,
                filename,
                fileSize,
                mimeType,
                fullText: textContent,
                chunks: chunks.map((c: any) => ({ index: c.index, text: c.content })),
            }),
        })

        if (!vectorizeResponse.ok) {
            throw new Error("Failed to vectorize document")
        }

        // 6. Save Cache
        const contentHash = crypto.createHash('sha256').update(textContent).digest('hex')

        await saveFileProcessingCache(
            agentId,
            filename,
            contentHash,
            fileSize,
            chunks.length,
            charge.puCost,
            charge.chargePercentage
        )

        // Success! Gateway created a NEW record. Delete our temporary PENDING record.
        try {
            await prisma.knowledgeBase.delete({ where: { id: pendingDocId } })
        } catch (e) {
            // Ignore if already gone
        }

        console.log(`[AsyncUpload] Completed successfully for ${filename}`)

        // Auto-generate metadata for the new document created by gateway
        try {
            const newDoc = await prisma.knowledgeBase.findFirst({
                where: { agentId, filename },
                orderBy: { createdAt: 'desc' }
            })
            if (newDoc) {
                await generateDocumentMetadata(userId, newDoc.id, filename, textContent, false)
            }
        } catch (metaErr) {
            console.warn(`[AsyncUpload] Metadata generation failed for ${filename}:`, metaErr)
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[AsyncUpload] Failed for ${filename}:`, error)

        // Update pending record to ERROR with reason
        // Try our original PENDING record first, then any gateway-created record
        try {
            const updated = await prisma.knowledgeBase.updateMany({
                where: { id: pendingDocId },
                data: {
                    status: 'ERROR',
                    aiMetadata: { error: errorMsg }
                }
            })

            // If original PENDING was already deleted by gateway, find the gateway's record
            if (updated.count === 0) {
                await prisma.knowledgeBase.updateMany({
                    where: {
                        agentId,
                        filename,
                        status: { in: ['PENDING', 'PARSED'] }
                    },
                    data: {
                        status: 'ERROR',
                        aiMetadata: { error: errorMsg }
                    }
                })
            }
        } catch (e) {
            console.error("Failed to update error status:", e)
        }
    }
}

export async function asyncScrapeAgentWebsite(agentId: string, url: string) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    // Verify ownership
    const agent = await prisma.agent.findUnique({
        where: { id: agentId, userId: user.id }
    })
    if (!agent) throw new Error("Agent not found or unauthorized")

    try {
        // Create PENDING record immediately
        const pendingDoc = await prisma.knowledgeBase.create({
            data: {
                agentId,
                filename: url, // Show URL as name initially
                fileSize: 0,
                status: 'PENDING',
                mimeType: 'text/html'
            }
        })

        // Background task: Scrape -> processDocumentAsync
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

                // Update pending doc title
                await prisma.knowledgeBase.update({
                    where: { id: pendingDoc.id },
                    data: { filename: title }
                })

                await processDocumentAsync(
                    user!.id!,
                    agentId,
                    pendingDoc.id,
                    title,
                    combinedText.length,
                    'text/plain',
                    { text: combinedText }
                )
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err)
                console.error(`[AsyncScrape] Failed for ${url}:`, err)
                await prisma.knowledgeBase.update({
                    where: { id: pendingDoc.id },
                    data: { status: 'ERROR', aiMetadata: { error: errorMsg } }
                }).catch(() => { })
            }
        }

        runScrapeAndProcess().catch(err => console.error("Async scrape background failed:", err))

        return { success: true, status: 'processing', id: pendingDoc.id }

    } catch (error) {
        console.error("Async scrape request failed:", error)
        return { success: false, error: error instanceof Error ? error.message : "Scrape failed" }
    }
}

// Shared metadata generation helper (used after vectorize completes)
const FALLBACK_METADATA_PROMPT = `Role: Expert Data Analyst.
Task: Analyze the provided text snippet and generate a structured JSON summary.

Output Format (JSON Only, no markdown):
{
  "ai_title": "Clear, readable title (3-5 words). No technical jargon like 'v2', 'scan'.",
  "category": "Specific category (e.g., 'Legal Contract', 'API Docs', 'Invoice', 'Technical Manual').",
  "summary": "Dense summary of the content (what is inside?). 2-3 sentences in Russian.",
  "utility": "Answer in Russian: What specific user questions can this file answer?",
  "topics": ["Tag1", "Tag2", "Tag3", "Tag4"]
}

Important:
- Respond ONLY with valid JSON, no explanations
- Write summary and utility in Russian
- Topics should be in original document language`

async function generateDocumentMetadata(
    userId: string,
    documentId: string,
    filename: string,
    textContent: string,
    isLibraryItem: boolean
) {
    const gatewayUrl = getGatewayUrl()
    if (!gatewayUrl) return

    const snippet = textContent

    const systemPrompt = await getActivePromptContent("metadata_generation") || FALLBACK_METADATA_PROMPT

    const response = await aiFetch(`${gatewayUrl}/api/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Original Filename: ${filename}\n\nText:\n${snippet}` }
            ],
            model: "gpt-4o-mini",
            temperature: 0.3,
            max_tokens: 500
        })
    })

    if (!response.ok) throw new Error(`Metadata LLM call failed: ${response.status}`)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || data.content || data.response
    if (!content) throw new Error("Empty LLM response for metadata")

    let jsonStr = content.trim()
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }
    const metadata = JSON.parse(jsonStr)

    // Track token usage
    if (data.usage) {
        const promptTokens = data.usage.prompt_tokens || 0
        const completionTokens = data.usage.completion_tokens || 0
        const totalTokens = promptTokens + completionTokens
        const puCost = totalTokens / 1000

        await trackTokenUsage({
            userId,
            model: "gpt-4o-mini",
            promptTokens,
            completionTokens,
            responseTimeMs: 0,
            isTest: false,
        })

        const billing = await getBillingSystem(userId)
        await billing.deductUsage(userId, puCost, {
            source: 'LLM_USAGE',
            description: `Metadata generation: ${totalTokens} tokens for ${filename}`,
            metadata: { model: 'gpt-4o-mini', promptTokens, completionTokens, documentId },
        })
    }

    // Save metadata
    if (isLibraryItem) {
        await prisma.libraryItem.update({
            where: { id: documentId },
            data: { aiMetadata: metadata }
        })
    } else {
        await prisma.knowledgeBase.update({
            where: { id: documentId },
            data: { aiMetadata: metadata }
        })
    }

    console.log(`[AutoMetadata] Generated metadata for ${documentId}`)
}

// Export for use in library.ts
export { generateDocumentMetadata }

// Cleanup stale PENDING docs older than 30 minutes (handles server restarts mid-processing)
export async function cleanupStalePendingDocs(agentId: string) {
    const user = await getCurrentUser()
    if (!user || !user.id) return { cleaned: 0 }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    try {
        const result = await prisma.knowledgeBase.updateMany({
            where: {
                agentId,
                agent: { userId: user.id },
                status: 'PENDING',
                createdAt: { lt: thirtyMinutesAgo }
            },
            data: { status: 'ERROR' }
        })

        if (result.count > 0) {
            console.log(`[Cleanup] Marked ${result.count} stale PENDING docs as ERROR for agent ${agentId}`)
        }

        return { cleaned: result.count }
    } catch (error) {
        console.error("[Cleanup] Failed:", error)
        return { cleaned: 0 }
    }
}
