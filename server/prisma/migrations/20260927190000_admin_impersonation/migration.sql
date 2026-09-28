-- Admin impersonation: audited, short-lived "operate as user" sessions.
-- The target user's real role is embedded in the issued token, so impersonation
-- can never escalate privileges; the originating admin is preserved as audit actor.

CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "impersonation_sessions_admin_id_started_at_idx"
    ON "impersonation_sessions"("admin_id", "started_at");

CREATE INDEX IF NOT EXISTS "impersonation_sessions_target_user_id_idx"
    ON "impersonation_sessions"("target_user_id");

CREATE INDEX IF NOT EXISTS "impersonation_sessions_expires_at_idx"
    ON "impersonation_sessions"("expires_at");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_admin_id_fkey'
    ) THEN
        ALTER TABLE "impersonation_sessions"
            ADD CONSTRAINT "impersonation_sessions_admin_id_fkey"
            FOREIGN KEY ("admin_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_target_user_id_fkey'
    ) THEN
        ALTER TABLE "impersonation_sessions"
            ADD CONSTRAINT "impersonation_sessions_target_user_id_fkey"
            FOREIGN KEY ("target_user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Defence in depth: a session can never impersonate itself.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'impersonation_sessions_no_self_check'
    ) THEN
        ALTER TABLE "impersonation_sessions"
            ADD CONSTRAINT "impersonation_sessions_no_self_check"
            CHECK ("admin_id" <> "target_user_id");
    END IF;
END $$;
