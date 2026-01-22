-- CreateTable
CREATE TABLE "chat_test_history" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "session_id" TEXT,
    "messages" JSONB NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_test_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_test_history_agent_id_idx" ON "chat_test_history"("agent_id");

-- CreateIndex
CREATE INDEX "chat_test_history_created_at_idx" ON "chat_test_history"("created_at");

-- AddForeignKey
ALTER TABLE "chat_test_history" ADD CONSTRAINT "chat_test_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
