-- Create user_sessions table for custom JWT session tracking
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on jti
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_jti_key" ON "user_sessions"("jti");

-- Create index on user_id
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- Create index on jti for faster lookups
CREATE INDEX IF NOT EXISTS "user_sessions_jti_idx" ON "user_sessions"("jti");

-- Add foreign key constraint
ALTER TABLE "user_sessions" 
ADD CONSTRAINT "user_sessions_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
