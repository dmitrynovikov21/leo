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

  if (!previousVersion) {
    // New file: 100% charge
    const puCost = tokensTopu(contentTokens * 1.5) // 1.5x processing multiplier
    return {
      puCost,
      reason: 'NEW_FILE: First upload of this document',
      chargePercentage: 100,
    }
  }

  // 4. Calculate similarity
  const similarity = await calculateSimilarity(previousVersion.contentHash, contentHash)
  const diffPercent = 100 - similarity

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
  const basePuCost = tokensTopu(contentTokens * 1.5)
  const puCost = (basePuCost * chargePercent) / 100

  return {
    puCost,
    reason: `${chargeReason}: ${diffPercent.toFixed(0)}% content changed from previous version`,
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

  await prisma.fileProcessingCache.create({
    data: {
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
 * Calculate similarity between two content hashes
 * For demo: uses simple string similarity
 * In production: should use streaming hash for large files
 */
async function calculateSimilarity(hash1: string, hash2: string): Promise<number> {
  // In a real implementation, we would:
  // 1. Download the original content using hash1
  // 2. Calculate proper text similarity (Levenshtein, Jaccard, etc.)
  // 3. Return percentage of similarity

  // For now: placeholder
  // If hashes are exactly the same, similarity is 100%
  // Otherwise, we would need access to the original file content
  if (hash1 === hash2) {
    return 100
  }

  // Placeholder: assume 50% similarity if different hashes
  // This should be replaced with actual content comparison
  return 50
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
