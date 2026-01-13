/*
  Warnings:

  - Made the column `is_test` on table `agent_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_test` on table `token_usage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "agent_messages" ALTER COLUMN "is_test" SET NOT NULL;

-- AlterTable
ALTER TABLE "token_usage" ALTER COLUMN "is_test" SET NOT NULL;

-- CreateTable
CREATE TABLE "agent_notes" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "vector_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_notes_agent_id_idx" ON "agent_notes"("agent_id");

-- AddForeignKey
ALTER TABLE "agent_notes" ADD CONSTRAINT "agent_notes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
