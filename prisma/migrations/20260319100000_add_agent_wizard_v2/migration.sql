-- AlterEnum: Add DRAFT status to AgentStatus
ALTER TYPE "AgentStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'STOPPED';

-- AlterTable: Add wizard fields to agents
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "wizard_data" JSONB;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "wizard_step" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "last_kb_update_at" TIMESTAMP(3);
