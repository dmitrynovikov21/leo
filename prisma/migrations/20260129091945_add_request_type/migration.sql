-- CreateEnum
CREATE TYPE "LlmRequestType" AS ENUM ('AGENT_CHAT', 'INSTRUCTION_GEN', 'TEST_GEN', 'SUMMARIZATION', 'CONFLICT_CHECK', 'RAG_QUERY', 'MANUAL_TEST', 'OTHER');

-- AlterTable
ALTER TABLE "token_usage" ADD COLUMN     "request_type" "LlmRequestType" NOT NULL DEFAULT 'AGENT_CHAT';

-- CreateIndex
CREATE INDEX "idx_token_usage_request_type" ON "token_usage"("request_type");
