-- Add welcome_message column to agents table
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
