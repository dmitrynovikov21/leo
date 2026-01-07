-- Add debounce_ms column to agents table
ALTER TABLE "agents" ADD COLUMN "debounce_ms" INTEGER NOT NULL DEFAULT 5000;
