# Token Balance System Documentation

## Overview

The Leo platform includes a comprehensive token balance system that allows users to purchase platform tokens and consume them for LLM API calls. The system tracks real costs (USD) and manages conversions between different token types.

## System Architecture

### Core Components

1. **User Token Balance** - Each user has a `tokenBalance` field storing their available platform tokens
2. **Token Rate Configuration** - Manages conversion rates:
   - Rubles to Platform Tokens (e.g., 1₽ = 2 tokens)
   - LLM Tokens to Platform Tokens (e.g., 1 LLM token = 2 platform tokens)
3. **Model Cost Configuration** - Stores real costs in USD for each AI model per 1M tokens
4. **Token Tracking** - Records all token usage and calculates real costs
5. **Transaction History** - Audit trail of all balance changes

### Database Models

#### TokenRateConfig
```prisma
model TokenRateConfig {
  id                  String    @id @default(cuid())
  rubToTokenRate      Decimal   // 1₽ = X platform tokens
  llmTokenToTokenRate Decimal   // 1 LLM token = X platform tokens
  isActive            Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedBy           String    // Admin user ID
}
```

**Note**: Only one configuration can be `isActive = true` at a time. Inactive configs are kept for audit purposes.

#### ModelCostConfig
```prisma
model ModelCostConfig {
  id                  String    @id @default(cuid())
  modelName           String    // e.g., "gpt-4o", "claude-3-5-sonnet"
  inputCostPerMillion Decimal   // $ per 1M input tokens
  outputCostPerMillion Decimal  // $ per 1M output tokens
  isActive            Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedBy           String
}
```

#### TokenTransaction
```prisma
model TokenTransaction {
  id           String          @id @default(cuid())
  userId       String
  type         TransactionType // TOPUP, DEDUCTION, ADJUSTMENT, REFUND
  amount       Decimal         // Can be negative for deductions
  balanceBefore Decimal
  balanceAfter  Decimal
  description  String?
  metadata     Json?           // Additional data
  createdAt    DateTime
  createdBy    String?         // Admin for ADJUSTMENT

  user         User            @relation(...)
}
```

#### Extended TokenUsage
```prisma
model TokenUsage {
  // ... existing fields
  platformTokensCharged Decimal?  // Tokens deducted from user
  realCostUsd           Decimal?  // Real USD cost
}
```

## Flow Diagrams

### User Top-up Flow

```
1. User clicks "Top-up" → TopupModal opens
2. User enters amount in RUB
3. Modal calculates: tokens_to_receive = amount_rub * rate.rubToTokenRate
4. User enters card details
5. Stripe payment created
6. On success: addTokens() called via webhook
7. TokenTransaction recorded as TOPUP
8. User balance updated
```

### LLM Request Flow

```
1. User makes request (test generation, metadata, etc.)
2. checkUserBalance() - verify sufficient tokens (estimated)
3. If insufficient: return 402 Payment Required
4. Call AI Gateway/LLM
5. Get response with usage (prompt_tokens, completion_tokens)
6. trackTokenUsage() called:
   a. Calculate real USD cost from ModelCostConfig
   b. Calculate platform tokens: llm_tokens * rate.llmTokenToTokenRate
   c. Create TokenUsage record
   d. deductTokens() from user balance
   e. Create TokenTransaction as DEDUCTION
7. Return response to user
```

## API Endpoints

### Balance Operations

**GET /api/balance** - Get current user balance
```json
Response: {
  "userId": "user-id",
  "balance": 1500.50
}
```

**POST /api/stripe/create-topup-payment** - Create payment intent
```json
Request: { "amount": 100 }
Response: {
  "clientSecret": "pi_xxxxx",
  "amount": 100,
  "tokensToAdd": 200
}
```

### Admin Operations

**GET /admin/token-rates** - Get all rate configurations
**POST /admin/token-rates** - Create new rate (deactivates previous)
**GET /admin/model-costs** - Get all model costs
**POST /admin/model-costs** - Create/update model cost
**GET /admin/unit-economics** - Get analytics data
**POST /admin/users-balance/topup** - Top-up user balance
**GET /admin/users** - List all users with balances

## Server Actions

### Token Rates (`actions/token-rates.ts`)
- `getTokenRates(limit, offset)` - List historical rates
- `getActiveTokenRate()` - Get current rate
- `createTokenRate(data)` - Create new rate
- `updateTokenRate(id, data)` - Update rate

### Model Costs (`actions/model-costs.ts`)
- `getModelCosts(limit, offset)` - List all costs
- `getModelCost(modelName)` - Get cost for specific model
- `upsertModelCost(data)` - Create/update cost
- `deleteModelCost(id)` - Soft delete
- `seedDefaultModelCosts()` - Initialize defaults

### Balance (`actions/balance.ts`)
- `getCurrentUserBalance()` - Get own balance
- `getUserBalanceAdmin(userId)` - Get any user's balance
- `addBalanceAdmin(userId, amount, description)` - Top-up user
- `getCurrentUserTransactionHistory()` - Get own transactions
- `getUserTransactionHistoryAdmin(userId)` - Get user's transactions
- `searchUsers(query)` - Search by email/name
- `getAllUsersWithBalances()` - List all users

### Unit Economics (`actions/unit-economics.ts`)
- `getUnitEconomics(dateFrom, dateTo)` - Get metrics for period
- `exportUnitEconomicsCSV(dateFrom, dateTo)` - Export to CSV
- `getUnitEconomicsSummary()` - Get 30-day summary

## Library Functions

### token-rates.ts
```typescript
getActiveRateConfig() → { rubToTokenRate, llmTokenToTokenRate }
calculateTokensFromRubles(rubles) → number
calculatePlatformTokensFromLlm(llmTokens) → number
getAllRateConfigs(limit, offset) → { configs, total }
```

### balance.ts
```typescript
getUserBalance(userId) → number
checkUserBalance(userId, requiredTokens) → boolean
deductTokens(params) → void  // Atomic transaction
addTokens(params) → void      // Atomic transaction
getTransactionHistory(userId, limit, offset) → { transactions, total }
```

### token-tracking.ts
```typescript
trackTokenUsage(params) → void
  // Automatically deducts from balance

calculateRealCost(model, promptTokens, completionTokens) → number (USD)

calculatePlatformTokens(llmTokensUsed) → number

getModelCost(modelName) → { inputCostPerMillion, outputCostPerMillion }

getUserTokenStats(userId, days) → { totalTokens, costs, byModel }

getAggregateTokenStats(startDate, endDate) → { totalTokens, costs, byModel }
```

## Admin Panel

### Token Rates Page (`/admin/token-rates`)
- Display current active rate (large cards)
- Form to create new rate
- Table of historical rates
- Auto-deactivates previous rate on creation

### Model Costs Page (`/admin/model-costs`)
- Table of all models with pricing
- Form to add/edit model costs
- Quick buttons for popular models
- Soft delete functionality

### Unit Economics Page (`/admin/unit-economics`)
- Date range selector
- Key metrics cards: Revenue, Costs, Margin, LLM Tokens
- Line chart: Revenue vs Costs by day
- Table breakdown by model
- CSV export functionality

### Users Balance Page (`/admin/users-balance`)
- Search users by email/name
- Table of all users with balances
- Top-up dialog
- Transaction history viewer

## Configuration

### Environment Variables

Stripe keys should already be configured:
```
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Initial Setup

1. Run migrations:
```bash
npx prisma migrate deploy
```

2. Seed initial configurations:
```bash
npm run db:seed
```

This will create:
- Default token rate: 1₽ = 2 tokens, 1 LLM token = 2 platform tokens
- Default model costs for popular models

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Balance Health**
   - Users with near-zero balance
   - Average balance per user
   - Total platform tokens in circulation

2. **Economics**
   - Daily revenue vs costs
   - Margin percentage
   - Cost per LLM token

3. **Usage**
   - Tokens consumed per day
   - Requests per model
   - Peak usage times

### Warning Signs

- Users hitting insufficient balance errors frequently
- Negative margins (costs exceed revenue)
- Uncaught deduction failures in logs
- Webhook failures for Stripe payments

## Troubleshooting

### Issue: "Insufficient balance" errors increasing

**Solutions:**
- Reduce initial token estimates in balance checks
- Run promotional top-ups for affected users
- Lower token conversion rates to give more tokens per ruble

### Issue: Balance discrepancies

**Diagnosis:**
```sql
-- Verify balance consistency
SELECT u.id, u.email, u.tokenBalance,
       SUM(CASE WHEN tt.type = 'TOPUP' THEN tt.amount ELSE 0 END) as total_topup,
       SUM(CASE WHEN tt.type = 'DEDUCTION' THEN ABS(tt.amount) ELSE 0 END) as total_deduction
FROM users u
LEFT JOIN token_transactions tt ON u.id = tt.user_id
GROUP BY u.id
HAVING u.tokenBalance != (
  SUM(CASE WHEN tt.type = 'TOPUP' THEN tt.amount ELSE 0 END) -
  SUM(CASE WHEN tt.type = 'DEDUCTION' THEN ABS(tt.amount) ELSE 0 END)
);
```

### Issue: Webhook failures for payments

**Check:**
1. Stripe webhook endpoint is reachable
2. Webhook secret matches environment
3. Logs show `[Stripe] Failed to add tokens` errors
4. Create manual adjustment via admin panel if needed

## Best Practices

1. **Rate Changes**
   - Create new rate (auto-deactivates old)
   - Old transactions keep original rate for audit
   - Document reason in commit message

2. **Model Pricing**
   - Update quarterly with actual provider rates
   - Monitor cost changes from providers
   - Keep historical data for reporting

3. **User Top-ups**
   - Set reasonable minimum (e.g., 100₽)
   - Implement quick-select buttons
   - Show token preview before payment

4. **Balance Checks**
   - Always check BEFORE expensive operations
   - Use conservative estimates (round up)
   - Fail fast with 402 status code

5. **Transactions**
   - Use database transactions for atomicity
   - Always record both sides (balance + transaction)
   - Include detailed descriptions
   - Store metadata for debugging

## Future Enhancements

1. **Subscription Plans** - Monthly token allowances
2. **Volume Discounts** - Better rates at higher volumes
3. **Usage Alerts** - Notify users approaching limits
4. **Rate Limits** - Prevent abuse via token exhaustion
5. **Token Expiry** - Optional time-based token expiration
6. **Referral Program** - Bonus tokens for referrals
7. **Analytics Dashboard** - User-facing usage charts

## Rollback Procedure

If issues arise:

1. **Pause token deductions** - temporarily disable trackTokenUsage
2. **Create adjustment transactions** - manually credit affected users
3. **Investigate logs** - find root cause
4. **Fix code** - deploy fix
5. **Resume tracking** - re-enable trackTokenUsage
6. **Audit balances** - verify all users settled correctly
