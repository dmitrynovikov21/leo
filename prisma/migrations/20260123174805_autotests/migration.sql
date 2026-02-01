-- AlterTable
ALTER TABLE "file_qa_questions" ADD COLUMN     "expected_answer" TEXT,
ADD COLUMN     "knowledge_base_id" TEXT;

-- CreateTable
CREATE TABLE "auto_test_runs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_test_run_results" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expected_answer" TEXT NOT NULL,
    "actual_answer" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "match_percentage" INTEGER NOT NULL,

    CONSTRAINT "auto_test_run_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_test_runs_agent_id_idx" ON "auto_test_runs"("agent_id");

-- CreateIndex
CREATE INDEX "auto_test_run_results_run_id_idx" ON "auto_test_run_results"("run_id");

-- AddForeignKey
ALTER TABLE "file_qa_questions" ADD CONSTRAINT "file_qa_questions_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_test_runs" ADD CONSTRAINT "auto_test_runs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_test_runs" ADD CONSTRAINT "auto_test_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_test_run_results" ADD CONSTRAINT "auto_test_run_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "auto_test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
