# Admin Guide: Token Balance System

## Quick Start

### First Time Setup

1. **Verify Database Migration**
   ```bash
   npx prisma migrate status
   ```
   Ensure migration `add_token_balance_system` is applied.

2. **Seed Initial Data**
   ```bash
   npm run db:seed
   ```
   This creates:
   - Initial token rate config (1₽ = 2 tokens)
   - Model pricing for popular LLMs

3. **Check Dashboard**
   - Go to `/admin`
   - You should see 4 new cards:
     - Token Rates
     - Model Costs
     - Unit Economics
     - User Balances

## Managing Token Rates

### Understanding Rates

A token rate has TWO conversion factors:

1. **Ruble to Platform Token Rate** (e.g., 1₽ = 2 tokens)
   - User paysthis in rubles
   - Gets this many platform tokens
   - Adjust up: users get more tokens per ruble (more generous)
   - Adjust down: users get fewer tokens per ruble (more revenue)

2. **LLM Token to Platform Token Rate** (e.g., 1 LLM = 2 tokens)
   - User spends these tokens when using LLMs
   - 1 LLM token consumed = 2 platform tokens deducted
   - Adjust up: costs more in platform tokens (less generous)
   - Adjust down: costs less in platform tokens (more generous)

### When to Change Rates

**Increase Rub to Token Rate:**
- Too many users running out of tokens
- Need to drive adoption
- During promotional periods

**Decrease Rub to Token Rate:**
- Too many free tokens in circulation
- Need to increase revenue per user
- System is economically unsustainable

**Increase LLM Token Rate:**
- Model costs increased (GPT-4 got expensive)
- Want to reduce usage
- Margin too thin

**Decrease LLM Token Rate:**
- Got better LLM pricing
- Want to encourage usage
- Need to spend tokens before expiry

### How to Change Rate

1. Go to **Admin → Token Rates**
2. Review current active rate (large cards)
3. In "Create New Rate Configuration" form:
   - Enter new `Rubles to Tokens` value
   - Enter new `LLM Token to Tokens` value
4. Click **Create New Rate**

**Important:**
- Previous rate auto-deactivates
- Old transactions keep original rate
- Change takes effect immediately for new purchases
- Already-purchased tokens use old deduction rate until depleted

### Viewing Rate History

Table shows all rate configurations in reverse chronological order:
- **Active** badge: currently used
- **Inactive** badge: historical rates

## Managing Model Costs

### Understanding Model Costs

Model costs represent **real expenses** you pay to LLM providers:
- **Input Cost**: $ per 1M input tokens
- **Output Cost**: $ per 1M output tokens

These determine actual margin when users consume tokens.

### Getting Accurate Costs

Check provider pricing:
- **OpenAI**: https://openai.com/pricing
- **Anthropic**: https://www.anthropic.com/pricing
- **Others**: Check their respective pricing pages

Example from OpenAI (January 2025):
- GPT-4o: $2.50 / 1M input, $10.00 / 1M output
- GPT-4o mini: $0.15 / 1M input, $0.60 / 1M output

### How to Add/Update Model Cost

1. Go to **Admin → Model Costs**
2. In form, either:
   - **Type model name** directly, or
   - **Click quick button** (GPT-4o, Claude, etc.)
3. Enter input cost per 1M tokens
4. Enter output cost per 1M tokens
5. Click **Save Model Cost**

### When Models Already Exist

Updating an existing model:
- Creates new "active" configuration
- Old configuration deactivates automatically
- Both kept in DB for audit trail
- Historical requests tracked with their original costs

## Understanding Unit Economics

### Key Metrics

**Revenue** (RUB → USD conversion)
- Sum of all TOPUP transactions
- Converted to USD at ~0.011 rate
- Shows money earned from users

**Costs** (Real LLM expenses)
- Sum of all model API calls in USD
- Calculated from token usage × model pricing
- Shows money spent on providers

**Margin**
- Revenue - Costs
- Positive: You're profitable
- Negative: You're spending more than earning
- Margin %: Margin / Revenue × 100

**Tokens**
- LLM Tokens: Actual tokens consumed from models
- Platform Tokens: Tokens deducted from users

### Reading the Dashboard

1. **Date Range Selector**
   - Default: Last 30 days
   - Adjust to analyze specific period
   - Click "Load Data"

2. **Metric Cards** (top row)
   - Revenue (RUB): Money from users
   - Costs (USD): Money to providers
   - Margin: Profit/loss
   - LLM Tokens: Usage volume

3. **Chart** (line graph)
   - Green line: Daily revenue
   - Red line: Daily costs
   - Intersection: Break-even point
   - Diverging: You're profitable/unprofitable

4. **Model Breakdown** (table)
   - Which models cost most?
   - Which models used most?
   - Identifies expensive patterns

### Example Analysis

```
Period: Last 30 days
Revenue: 1000₽ (~$11 USD)
Costs: $8.50 USD
Margin: $2.50 USD (22.7%)
```

Interpretation: For every dollar of revenue, you keep $0.227. Good margin!

```
Period: Last 7 days
Revenue: 500₽ (~$5.50 USD)
Costs: $7.20 USD
Margin: -$1.70 USD (-31%)
```

Interpretation: Spending more than earning. Either raise prices (reduce token rates) or reduce costs (negotiate with providers).

### Using CSV Export

1. Select date range
2. Click "Export CSV"
3. File downloads: `unit-economics-YYYY-MM-DD.csv`
4. Import to Excel/Sheets for detailed analysis

## Managing User Balances

### Viewing Balances

1. Go to **Admin → User Balances**
2. Table shows:
   - **Email**: User's email
   - **Balance**: Current tokens (right-aligned)
   - **Created**: Account creation date
   - **Last Transaction**: Last balance change

3. **Search**
   - Type email or name
   - Minimum 2 characters
   - Click "Search"
   - Click "Reset" to show all users

### Checking User History

For any user:
1. Click **History** button
2. Dialog shows all transactions:
   - Type: TOPUP, DEDUCTION, ADJUSTMENT, REFUND
   - Amount: Tokens changed (green=add, red=subtract)
   - Before/After: Balance before and after
   - Date: When transaction occurred
   - By: Who made the change (for admin actions)

### Topping Up User Balance

**When to do this:**
- User had technical issue (was charged twice)
- Promotional/loyalty reward
- Bug compensation
- Payment processing issue

**How:**
1. Click **Top-up** button next to user
2. Enter **Number of Tokens** to add
3. Enter **Description** (why this adjustment?)
4. Click **Add Tokens**

**Example Description:**
- "Refund: Double charge on 2025-01-25"
- "Promo: New user welcome bonus"
- "Bug fix: Token calculation error"
- "Loyalty: Long-term customer reward"

### Manual Adjustments

Manual adjustments appear as:
- **Type**: ADJUSTMENT
- **Created By**: Admin user ID
- **Description**: Your custom message

These are fully auditable - always document why!

## Monitoring & Troubleshooting

### Daily Checks

```
Morning:
□ Check Unit Economics for unexpected costs
□ Review last 24h revenue vs costs
□ Look for any error patterns in logs

Evening:
□ Verify all day's transactions completed
□ Check for failed Stripe webhooks
□ Balance check: total users' balances reasonable?
```

### Red Flags

1. **Sudden cost spike**
   - Check `byModel` table - which model?
   - Might indicate:
     - Provider price change
     - Code bug causing excess requests
     - Abuse/DDoS

2. **Users hitting insufficient balance**
   - Check user activity patterns
   - Consider:
     - Raising token rates (more tokens per ruble)
     - Adjusting LLM rate (cheaper to use)
     - Promotional top-ups

3. **Negative margin**
   - You're losing money
   - Actions:
     - Raise Rub to Token rate (less tokens per ruble)
     - Lower LLM Token rate (more expensive to use)
     - Negotiate better LLM pricing
     - Cut support for expensive models

4. **Webhook failures**
   - Check Stripe webhook logs
   - Likely: Endpoint timeout or network issue
   - Action: Manually top-up affected users

### Common Issues & Solutions

**Issue: User reports payment succeeded but no tokens received**

Solution:
1. Check transaction history - see TOPUP?
2. If not: webhook failed
   - Go to Stripe dashboard
   - Find payment intent
   - Check webhook event
   - Manually add tokens (use "Bug fix: Webhook failure" reason)

**Issue: Costs seem too high**

Investigation:
1. Go to Unit Economics
2. Check `byModel` table - which model costs most?
3. Check model's input/output cost config
4. Verify against provider's current pricing
5. Update if prices changed at provider

**Issue: User balance is negative (should never happen!)**

This is a bug:
1. Note the user ID and exact balance
2. Create an issue/ticket
3. Immediately adjust user to positive balance
4. Investigate root cause in code

## Deployment Checklist

When deploying token system to production:

### Before Migration
- [ ] Backup database
- [ ] Notify users if any service interruption expected
- [ ] Test migration on staging environment

### During Migration
- [ ] Run: `npx prisma migrate deploy`
- [ ] Run: `npm run db:seed` (creates initial configs)
- [ ] Verify no errors in logs

### After Deployment
- [ ] Check admin pages load correctly
- [ ] Test token rate creation
- [ ] Test model cost configuration
- [ ] Verify Stripe webhook integration
- [ ] Test top-up flow end-to-end
- [ ] Verify balance display in user app

### First Week Monitoring
- [ ] Check daily costs are reasonable
- [ ] Monitor user balance distribution
- [ ] Verify no transaction failures
- [ ] Check error logs for issues
- [ ] Get user feedback on top-up experience

## FAQ

**Q: Can I change past transactions?**
A: No. Transactions are immutable for audit trail. Only add NEW adjustment transactions.

**Q: What if I need to refund a user?**
A: Create ADJUSTMENT transaction with negative amount and reason like "Refund: ticket-#123"

**Q: How do I handle large-scale top-ups (e.g., promo)?**
A: Use server actions to script it:
```typescript
// Example: Give all users 100 tokens
const users = await prisma.user.findMany();
for (const user of users) {
  await addTokens({
    userId: user.id,
    amount: 100,
    type: 'ADJUSTMENT',
    description: 'Promotion: Anniversary bonus',
    createdBy: admin_user_id
  });
}
```

**Q: What exchange rate do you use for RUB to USD?**
A: Currently ~0.011 (1₽ ≈ $0.011 USD). Check `getUnitEconomics()` function for exact rate.

**Q: Can users see their balance?**
A: Yes. Display shows in app header (if integrated). They also see transactions in their account.

**Q: What happens if user balance goes negative?**
A: System prevents it via database checks and balance validation before LLM calls. If it happens = bug.

**Q: How long do tokens last?**
A: Currently: no expiration. Future enhancement: optional token expiry.
