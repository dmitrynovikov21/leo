-- AlterTable
ALTER TABLE "knowledge_bases" ADD COLUMN     "ai_metadata" JSONB;

-- CreateTable
CREATE TABLE "file_qa_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expected_reasoning" TEXT,
    "source_type" TEXT NOT NULL,
    "library_item_id" TEXT,
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_qa_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_qa_questions_library_item_id_idx" ON "file_qa_questions"("library_item_id");

-- CreateIndex
CREATE INDEX "file_qa_questions_agent_id_idx" ON "file_qa_questions"("agent_id");

-- AddForeignKey
ALTER TABLE "file_qa_questions" ADD CONSTRAINT "file_qa_questions_library_item_id_fkey" FOREIGN KEY ("library_item_id") REFERENCES "library_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_qa_questions" ADD CONSTRAINT "file_qa_questions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
