-- CreateEnum
CREATE TYPE "PuTransactionType" AS ENUM ('SUBSCRIPTION_GRANT', 'OVERAGE_DEDUCTION', 'PACK_TOPUP', 'ADMIN_ADJUSTMENT', 'REFUND', 'RESET');

-- CreateEnum
CREATE TYPE "PuNotificationType" AS ENUM ('WARNING_80_PERCENT', 'LIMIT_REACHED', 'OVERDRAFT_WARNING', 'SERVICE_BLOCKED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED', 'FROZEN');

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthly_pu_limit" DECIMAL(10,2) NOT NULL,
    "price_monthly_rub" DECIMAL(10,2) NOT NULL,
    "overage_pu_price_rub" DECIMAL(10,2) NOT NULL,
    "overage_dialog_price_rub" DECIMAL(10,2) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "stripe_price_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "pu_balance" DECIMAL(12,4) NOT NULL,
    "pu_limit" DECIMAL(10,2) NOT NULL,
    "billing_cycle_start_date" TIMESTAMP(3) NOT NULL,
    "next_reset_date" TIMESTAMP(3) NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_status" TEXT,
    "pu_used_this_cycle" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "overage_pu_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "is_overdraft" BOOLEAN NOT NULL DEFAULT false,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pu_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PuTransactionType" NOT NULL,
    "puAmount" DECIMAL(12,4) NOT NULL,
    "balance_before" DECIMAL(12,4) NOT NULL,
    "balance_after" DECIMAL(12,4) NOT NULL,
    "source" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "billing_cycle_date" TIMESTAMP(3),
    "cost_rub" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "pu_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pu_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PuNotificationType" NOT NULL,
    "pu_balance" DECIMAL(12,4) NOT NULL,
    "pu_limit" DECIMAL(10,2) NOT NULL,
    "usage_percent" INTEGER NOT NULL,
    "was_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "channel" TEXT,
    "billing_cycle_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pu_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_processing_cache" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "chunk_count" INTEGER NOT NULL,
    "pu_charged" DECIMAL(10,4) NOT NULL,
    "vectorization_date" TIMESTAMP(3) NOT NULL,
    "previous_version" TEXT,
    "diff_percentage" INTEGER,
    "charge_percentage" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_processing_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frozen_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "plan_code_required" TEXT NOT NULL,
    "pu_size_estimate" DECIMAL(10,2) NOT NULL,
    "frozen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delete_scheduled_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "frozen_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_idx" ON "subscription_plans"("is_active");

-- CreateIndex
CREATE INDEX "subscription_plans_display_order_idx" ON "subscription_plans"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_key" ON "user_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_stripe_subscription_id_key" ON "user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_plan_id_idx" ON "user_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_next_reset_date_idx" ON "user_subscriptions"("next_reset_date");

-- CreateIndex
CREATE INDEX "user_subscriptions_is_blocked_idx" ON "user_subscriptions"("is_blocked");

-- CreateIndex
CREATE INDEX "pu_transactions_user_id_idx" ON "pu_transactions"("user_id");

-- CreateIndex
CREATE INDEX "pu_transactions_type_idx" ON "pu_transactions"("type");

-- CreateIndex
CREATE INDEX "pu_transactions_created_at_idx" ON "pu_transactions"("created_at");

-- CreateIndex
CREATE INDEX "pu_transactions_billing_cycle_date_idx" ON "pu_transactions"("billing_cycle_date");

-- CreateIndex
CREATE INDEX "pu_notifications_user_id_idx" ON "pu_notifications"("user_id");

-- CreateIndex
CREATE INDEX "pu_notifications_was_sent_idx" ON "pu_notifications"("was_sent");

-- CreateIndex
CREATE UNIQUE INDEX "pu_notifications_user_id_type_billing_cycle_date_key" ON "pu_notifications"("user_id", "type", "billing_cycle_date");

-- CreateIndex
CREATE INDEX "file_processing_cache_agent_id_idx" ON "file_processing_cache"("agent_id");

-- CreateIndex
CREATE INDEX "file_processing_cache_content_hash_idx" ON "file_processing_cache"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "file_processing_cache_agent_id_content_hash_key" ON "file_processing_cache"("agent_id", "content_hash");

-- CreateIndex
CREATE INDEX "frozen_data_user_id_idx" ON "frozen_data"("user_id");

-- CreateIndex
CREATE INDEX "frozen_data_delete_scheduled_at_idx" ON "frozen_data"("delete_scheduled_at");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pu_transactions" ADD CONSTRAINT "pu_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pu_notifications" ADD CONSTRAINT "pu_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frozen_data" ADD CONSTRAINT "frozen_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
