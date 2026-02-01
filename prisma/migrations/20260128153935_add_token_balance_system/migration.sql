-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'DEDUCTION', 'ADJUSTMENT', 'REFUND');

-- AlterTable
ALTER TABLE "token_usage" ADD COLUMN     "platform_tokens_charged" DECIMAL(20,2),
ADD COLUMN     "real_cost_usd" DECIMAL(10,6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_balance" DECIMAL(20,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "token_rate_configs" (
    "id" TEXT NOT NULL,
    "rub_to_token_rate" DECIMAL(10,2) NOT NULL,
    "llm_token_to_token_rate" DECIMAL(10,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "token_rate_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_cost_configs" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "input_cost_per_million" DECIMAL(10,4) NOT NULL,
    "output_cost_per_million" DECIMAL(10,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "model_cost_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "balance_before" DECIMAL(20,2) NOT NULL,
    "balance_after" DECIMAL(20,2) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "token_rate_configs_is_active_idx" ON "token_rate_configs"("is_active");

-- CreateIndex
CREATE INDEX "model_cost_configs_model_name_idx" ON "model_cost_configs"("model_name");

-- CreateIndex
CREATE UNIQUE INDEX "model_cost_configs_model_name_is_active_key" ON "model_cost_configs"("model_name", "is_active");

-- CreateIndex
CREATE INDEX "token_transactions_user_id_idx" ON "token_transactions"("user_id");

-- CreateIndex
CREATE INDEX "token_transactions_type_idx" ON "token_transactions"("type");

-- CreateIndex
CREATE INDEX "token_transactions_created_at_idx" ON "token_transactions"("created_at");

-- AddForeignKey
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
