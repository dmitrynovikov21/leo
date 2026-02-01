/**
 * PU (Processing Unit) Calculator
 * 1 PU = 1,000 tokens
 */

/**
 * Convert LLM tokens to Processing Units
 */
export function tokensTopu(tokens: number): number {
  return tokens / 1000
}

/**
 * Convert Processing Units to LLM tokens
 */
export function puToTokens(pu: number): number {
  return pu * 1000
}

/**
 * Calculate PU cost for LLM request
 */
export function calculateLlmPuCost(promptTokens: number, completionTokens: number): number {
  const totalTokens = promptTokens + completionTokens
  return tokensTopu(totalTokens)
}

/**
 * Estimate PU cost for vectorization based on document size
 * Rough estimate: 1 chunk ≈ 500-1000 tokens depending on type
 */
export function estimateVectorizationPuCost(documentTokens: number): number {
  // Vectorization uses input tokens with 1.5x processing multiplier
  const processedTokens = documentTokens * 1.5
  return tokensTopu(processedTokens)
}

/**
 * Calculate price in Rubles based on PU amount
 * This is for display purposes - actual pricing is in subscription plan
 */
export function calculatePriceRub(pu: number, rubPerPu: number = 19.5): number {
  // Average: Basic plan is 3900 RUB for 200 PU = 19.5 RUB per PU
  return pu * rubPerPu
}

/**
 * Format PU for display
 */
export function formatPu(pu: number, decimals: number = 1): string {
  return pu.toFixed(decimals)
}

/**
 * Get usage percentage
 */
export function getUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 0
  return (used / limit) * 100
}

/**
 * Calculate overage amount
 */
export function calculateOverage(used: number, limit: number): number {
  return Math.max(0, used - limit)
}

/**
 * Get remaining PU in current cycle
 */
export function getRemainingPu(balance: number, limit: number): number {
  return Math.max(0, balance - Math.max(0, balance - limit))
}
