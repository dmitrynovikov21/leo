import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Calculate smart charge for file upload
 * Returns PU cost and reason
 */
export async function calculateFileCharge(
  agentId: string,
  filename: string,
  content: Buffer,
  contentTokens: number
): Promise<{ puCost: number; reason: string; chargePercentage: number }> {
  // 1. Calculate content hash
  const contentHash = crypto.createHash('sha256').update(content).digest('hex')

  // 2. Check for exact duplicate
  const cached = await prisma.fileProcessingCache.findUnique({
    where: {
      agentId_contentHash: { agentId, contentHash },
    },
  })

  if (cached) {
    return {
      puCost: 0,
      reason: 'DUPLICATE: File already processed',
      chargePercentage: 0,
    }
  }

  // 3. Find previous version (same filename, different hash)
  const previousVersion = await prisma.fileProcessingCache.findFirst({
    where: { agentId, filename },
    orderBy: { createdAt: 'desc' },
  })

  // Helper to convert tokens to PU (1 PU = 1000 tokens)
  const basePuCost = Math.ceil(contentTokens / 1000)

  if (!previousVersion) {
    // New file: 100% charge
    return {
      puCost: basePuCost,
      reason: 'NEW_FILE: First upload of this document',
      chargePercentage: 100,
    }
  }

  // 4. Calculate similarity
  // Since we don't store full content in DB, we can't comparse unless we had it.
  // BUT the previous implementation suggested we might not have the old content.
  // Wait, if we don't have the old content, we can't calculate similarity.
  // However, the `previousVersion` only stores hash and metadata. 
  // We CANNOT calculate similarity without the old content.
  // 
  // FIX: We need to fetch the old content. Where is it stored?
  // `LibraryItem` has content. `KnowledgeBase` has `fileUrl` (S3/UploadThing) or chunks.
  // We can reconstruct from chunks if available.

  // For this implementation, since we need to stick to the plan:
  // If we can't get previous content, we must assume significantly different? 
  // Or we can try to find the previous content from LibraryItem/KnowledgeBase if linked?
  // `FileProcessingCache` doesn't link to the source item directly, but we have `agentId` and `filename`.

  // Let's try to fetch previous content from LibraryItem (if it exists)
  // Assuming agentId = "user-[id]" for LibraryItems.

  let previousContentString = ""

  // Try finding in LibraryItem
  if (agentId.startsWith('user-')) {
    const userId = agentId.replace('user-', '')
    const libItem = await prisma.libraryItem.findFirst({
      where: { userId, name: filename, type: 'FILE' },
      include: { chunks: true }
    })

    if (libItem) {
      if (libItem.content) {
        previousContentString = libItem.content
      } else if (libItem.chunks.length > 0) {
        previousContentString = libItem.chunks.map(c => c.content).join(' ')
      }
    }
  } else {
    // Try finding in KnowledgeBase (Agent)
    const kbItem = await prisma.knowledgeBase.findFirst({
      where: { agentId, filename },
      include: { chunks: true }
    })

    if (kbItem && kbItem.chunks.length > 0) {
      previousContentString = kbItem.chunks.map(c => c.content).join(' ')
    }
  }

  let diffPercent = 100

  if (previousContentString) {
    const currentContentString = content.toString('utf-8')
    const similarity = calculateJaccardSimilarity(previousContentString, currentContentString)
    diffPercent = 100 - similarity
  }

  // 5. Apply charging rules based on diff percentage
  let chargePercent = 100
  let chargeReason = 'FULL_REPLACEMENT'

  if (diffPercent < 30) {
    // Minor update: <30% changed
    chargePercent = 20
    chargeReason = 'MINOR_UPDATE'
  } else if (diffPercent < 60) {
    // Major update: 30-60% changed
    chargePercent = 70
    chargeReason = 'MAJOR_UPDATE'
  }

  // Calculate final cost
  const puCost = (basePuCost * chargePercent) / 100

  return {
    puCost,
    reason: `${chargeReason}: ${diffPercent.toFixed(0)}% content changed`,
    chargePercentage: chargePercent,
  }
}

/**
 * Save file processing cache
 */
export async function saveFileProcessingCache(
  agentId: string,
  filename: string,
  contentHash: string,
  fileSize: number,
  chunkCount: number,
  puCharged: number,
  chargePercentage: number,
  diffPercentage?: number
) {
  // Find previous version
  const previousVersion = await prisma.fileProcessingCache.findFirst({
    where: { agentId, filename },
    orderBy: { createdAt: 'desc' },
  })

  await prisma.fileProcessingCache.upsert({
    where: {
      agentId_contentHash: { agentId, contentHash },
    },
    update: {
      filename,
      fileSize,
      chunkCount,
      puCharged: new Decimal(puCharged),
      vectorizationDate: new Date(),
      previousVersion: previousVersion?.contentHash,
      diffPercentage: diffPercentage ?? null,
      chargePercentage,
    },
    create: {
      agentId,
      filename,
      contentHash,
      fileSize,
      chunkCount,
      puCharged: new Decimal(puCharged),
      vectorizationDate: new Date(),
      previousVersion: previousVersion?.contentHash,
      diffPercentage: diffPercentage ?? null,
      chargePercentage,
    },
  })
}

/**
 * Get file processing history for agent
 */
export async function getFileProcessingHistory(agentId: string, limit: number = 100) {
  return prisma.fileProcessingCache.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Helper: Convert tokens to PU (1 PU = 1000 tokens)
 */
function tokensTopu(tokens: number): number {
  return tokens / 1000
}

/**
 * Calculate Jaccard Similarity between two texts (word-based)
 * Returns 0-100 percentage
 */
function calculateJaccardSimilarity(text1: string, text2: string): number {
  const tokenize = (text: string) => {
    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s\u0400-\u04FF]/g, '') // Keep alphanumeric and Cyrillic
        .split(/\s+/)
        .filter(w => w.length > 2) // Filter short words
    );
  }

  const set1 = tokenize(text1)
  const set2 = tokenize(text2)

  if (set1.size === 0 && set2.size === 0) return 100
  if (set1.size === 0 || set2.size === 0) return 0

  // Intersection
  let intersection = 0
  set1.forEach(word => {
    if (set2.has(word)) intersection++
  })

  // Union
  const union = set1.size + set2.size - intersection

  return (intersection / union) * 100
}

/**
 * Get total PU charged for a file
 */
export async function getFilePuCost(agentId: string, filename: string): Promise<number> {
  const history = await prisma.fileProcessingCache.findMany({
    where: { agentId, filename },
  })

  return history.reduce((sum, item) => sum + parseFloat(item.puCharged.toString()), 0)
}
