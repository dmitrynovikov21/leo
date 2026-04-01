"use server"

import { getCurrentUser } from "@/lib/session"
import { prisma } from "@/lib/db"
import { getBillingSystem } from "@/lib/billing-adapter"
import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { getActivePromptContent } from "@/actions/system-prompts"
import { trackTokenUsage } from "@/lib/token-tracking"
import { aiFetch, getGatewayUrl } from "@/lib/ai-fetch"
import { fixFilename } from "@/lib/utils"

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

const ALLOWED_EXTENSIONS = new Set([
    'pdf','doc','docx','xls','xlsx','csv','json','html','htm',
    'pptx','ppt','txt','md','png','jpg','jpeg','webp','bmp','tiff','gif'
])

export async function uploadAgentDocument(data: {
    agentId: string
    file: FormData
}) {
    const user = await getCurrentUser()
    if (!user || !user.id) throw new Error("Unauthorized")

    const file = data.file.get('file') as File
    if (!file) throw new Error("File not found")

    const agentId = data.agentId
    const filename = fixFilename(file.name)
    const fileSize = file.size
    const mimeType = file.type || 'application/octet-stream'

    // Validate file type
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return { success: false, error: `Формат .${ext} не поддерживается. Поддерживаются: PDF, Word, Excel, CSV, JSON, HTML, PPTX, TXT, MD, изображения.` }
    }

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
            // Use Uint8Array slice to avoid Node.js Buffer pool issues
            // (Buffer.buffer returns the full pool ArrayBuffer, not just the file data)
            const safeArray = new Uint8Array(data.buffer)
            const blob = new Blob([safeArray], { type: mimeType })
            parseFormData.append('file', blob, filename)

            const parseResponse = await aiFetch(`${gatewayUrl}/api/v1/documents/parse`, {
                method: 'POST',
                body: parseFormData,
            })

            if (!parseResponse.ok) {
                const errData = await parseResponse.json().catch(() => ({}))
                throw new Error(errData.error || "Не удалось обработать документ")
            }

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

        console.log(`[AsyncUpload] Prepared ${chunks.length} chunks`)

        // PU charging is handled by the gateway vectorize endpoint
        // to avoid double-charging (gateway also calculates & deducts PU)

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
            const errData = await vectorizeResponse.json().catch(() => ({}))
            const errMsg = errData.message || errData.error || `Vectorize failed (${vectorizeResponse.status})`
            console.error(`[AsyncUpload] Vectorize error for ${filename}:`, vectorizeResponse.status, errData)
            throw new Error(errMsg)
        }

        // Cache is saved by the gateway vectorize endpoint

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
        const rawMsg = error instanceof Error ? error.message : String(error)
        console.error(`[AsyncUpload] Failed for ${filename}:`, error)

        // Map technical errors to user-friendly messages
        let errorMsg = rawMsg
        if (rawMsg.includes('fetch failed') || rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ETIMEDOUT')) {
            errorMsg = `Не удалось обработать файл "${filename}". Сервис временно недоступен, попробуйте позже.`
        } else if (rawMsg.includes('tokens') && rawMsg.includes('max')) {
            errorMsg = `Файл "${filename}" слишком большой для обработки. Попробуйте разбить его на части.`
        } else if (rawMsg.includes('Insufficient') && rawMsg.includes('balance')) {
            errorMsg = `Недостаточно средств для обработки файла "${filename}".`
        }

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
                        status: { in: ['PENDING', 'PARSED', 'ERROR'] }
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

                if (!items || items.length === 0) throw new Error("Не удалось получить данные со страницы. Проверьте URL и попробуйте снова.")

                const combinedText = items
                    .map((item: any) => item.text || item.markdown || "")
                    .filter((t: string) => t.length > 0)
                    .join("\n\n---\n\n")

                if (combinedText.length === 0) throw new Error("Страница не содержит текстового контента")

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
            model: "claude-sonnet-4-6",
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
            model: "claude-sonnet-4-6",
            promptTokens,
            completionTokens,
            responseTimeMs: 0,
            isTest: false,
        })

        // Resolve agentId from document
        let docAgentId: string | undefined
        if (!isLibraryItem) {
            const kb = await prisma.knowledgeBase.findUnique({ where: { id: documentId }, select: { agentId: true } })
            docAgentId = kb?.agentId || undefined
        }

        const billing = await getBillingSystem(userId)
        await billing.deductUsage(userId, puCost, {
            source: 'LLM_USAGE',
            description: `Анализ документа: ${filename}`,
            metadata: { model: 'claude-sonnet-4-6', promptTokens, completionTokens, documentId, agentId: docAgentId, fileName: filename },
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

// Regenerate missing metadata for VECTORIZED docs that somehow lost their description
export async function regenerateMissingMetadata(agentId: string) {
    const user = await getCurrentUser()
    if (!user || !user.id) return { triggered: 0 }

    try {
        // Find all VECTORIZED docs for this agent with their chunks
        const allDocs = await prisma.knowledgeBase.findMany({
            where: {
                agentId,
                agent: { userId: user.id },
                status: 'VECTORIZED',
            },
            include: {
                chunks: {
                    orderBy: { chunkIndex: 'asc' },
                    take: 20,
                    select: { content: true }
                }
            }
        })

        // Filter to docs that need metadata regeneration
        const needsRegen = allDocs.filter(d => {
            const meta = d.aiMetadata as any
            if (!meta) return true                    // null metadata
            if (typeof meta !== 'object') return true // invalid metadata
            if (meta.error) return false              // has error — don't retry automatically
            if (meta.summary) return false            // already has summary
            return true                               // metadata exists but no summary
        })

        if (needsRegen.length === 0) return { triggered: 0 }

        console.log(`[RegenMetadata] Found ${needsRegen.length} docs without metadata for agent ${agentId}`)

        // Fire-and-forget regeneration for each doc
        for (const doc of needsRegen) {
            const textContent = doc.chunks.map(c => c.content).join('\n\n')
            if (textContent.length < 10) continue // skip empty docs

            generateDocumentMetadata(user.id, doc.id, doc.filename, textContent, false)
                .catch(err => console.warn(`[RegenMetadata] Failed for ${doc.id}:`, err))
        }

        return { triggered: needsRegen.length }
    } catch (error) {
        console.error("[RegenMetadata] Failed:", error)
        return { triggered: 0 }
    }
}

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
