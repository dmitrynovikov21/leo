-- CreateEnum
CREATE TYPE "ConflictStatus" AS ENUM ('NEW', 'RESOLVED', 'IGNORED');

-- AlterTable
ALTER TABLE "library_items" ADD COLUMN     "ai_metadata" JSONB;

-- CreateTable
CREATE TABLE "knowledge_conflicts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "chat_id" TEXT,
    "topic" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "status" "ConflictStatus" NOT NULL DEFAULT 'NEW',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_conflicts_user_id_idx" ON "knowledge_conflicts"("user_id");

-- CreateIndex
CREATE INDEX "knowledge_conflicts_status_idx" ON "knowledge_conflicts"("status");

-- CreateIndex
CREATE INDEX "knowledge_conflicts_detected_at_idx" ON "knowledge_conflicts"("detected_at");

-- AddForeignKey
ALTER TABLE "knowledge_conflicts" ADD CONSTRAINT "knowledge_conflicts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
