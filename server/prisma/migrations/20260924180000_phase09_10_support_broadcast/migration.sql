-- Phase 09 + 10: Investor Support, Notifications & Broadcast
-- Ticket numbers / lifecycle / assignment / attachments, broadcast + delivery
-- tracking, and bilingual notification content.

-- ── Phase 09: support tickets ────────────────────────────────────────────────

ALTER TABLE "support_tickets"
  ADD COLUMN "ticket_number" VARCHAR(20),
  ADD COLUMN "assigned_to_id" UUID,
  ADD COLUMN "assigned_at" TIMESTAMP,
  ADD COLUMN "assigned_by_id" UUID,
  ADD COLUMN "last_message_at" TIMESTAMP;

-- Backfill human-readable ticket numbers for existing rows.
DO $$
DECLARE
  rec RECORD;
  seq INT := 0;
BEGIN
  FOR rec IN SELECT id, created_at FROM "support_tickets" ORDER BY created_at ASC LOOP
    seq := seq + 1;
    UPDATE "support_tickets"
    SET "ticket_number" = 'TKT-' || TO_CHAR(rec.created_at, 'YYYY') || '-' || LPAD(seq::TEXT, 6, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE "support_tickets"
  ALTER COLUMN "ticket_number" SET NOT NULL,
  ADD CONSTRAINT "support_tickets_ticket_number_key" UNIQUE ("ticket_number"),
  ALTER COLUMN "priority" TYPE VARCHAR(20),
  ALTER COLUMN "status" TYPE VARCHAR(30);

-- Legacy priority value migration: normal → medium.
UPDATE "support_tickets" SET "priority" = 'medium' WHERE "priority" = 'normal';

CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");
CREATE INDEX "support_tickets_category_idx" ON "support_tickets"("category");
CREATE INDEX "support_tickets_assigned_to_id_idx" ON "support_tickets"("assigned_to_id");
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "support_tickets_assigned_by_id_fkey"
    FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "support_messages"
  ADD COLUMN "sender_role" VARCHAR(30),
  ADD COLUMN "edited_at" TIMESTAMP;

-- Sender role backfill from current users.
UPDATE "support_messages" m
SET "sender_role" = u.role_name
FROM (
  SELECT sm.id, r.name AS role_name
  FROM "support_messages" sm
  JOIN "users" u ON u.id = sm.sender_id
  JOIN "roles" r ON r.id = u.role_id
) u
WHERE m.id = u.id;

CREATE INDEX "support_messages_created_at_idx" ON "support_messages"("created_at");

-- Ticket attachments (files live under uploads/support-attachments)
CREATE TABLE "support_ticket_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL,
  "message_id" UUID,
  "file_name" VARCHAR(255) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "storage_path" TEXT NOT NULL,
  "uploaded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_ticket_attachments_ticket_id_idx" ON "support_ticket_attachments"("ticket_id");
CREATE INDEX "support_ticket_attachments_message_id_idx" ON "support_ticket_attachments"("message_id");
CREATE INDEX "support_ticket_attachments_uploaded_by_id_idx" ON "support_ticket_attachments"("uploaded_by_id");

ALTER TABLE "support_ticket_attachments"
  ADD CONSTRAINT "support_ticket_attachments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "support_ticket_attachments_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "support_ticket_attachments_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id");

-- ── Phase 10: broadcasts ────────────────────────────────────────────────────

CREATE TYPE "BroadcastAudience" AS ENUM ('ALL_INVESTORS', 'ALL_BROKERS', 'SPECIFIC_USERS', 'SEGMENT');
CREATE TYPE "BroadcastStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
CREATE TYPE "BroadcastDelivery" AS ENUM ('created', 'queued', 'sent', 'failed', 'read');

CREATE TABLE "broadcasts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title_en" VARCHAR(255) NOT NULL,
  "title_ar" VARCHAR(255) NOT NULL,
  "message_en" TEXT NOT NULL,
  "message_ar" TEXT NOT NULL,
  "cta_label_en" VARCHAR(100),
  "cta_label_ar" VARCHAR(100),
  "external_url" VARCHAR(2048),
  "image_url" VARCHAR(512),
  "audience_type" "BroadcastAudience" NOT NULL DEFAULT 'ALL_INVESTORS',
  "target_user_ids" JSONB,
  "segment_key" VARCHAR(50),
  "status" "BroadcastStatus" NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMP,
  "sent_at" TIMESTAMP,
  "sent_by_id" UUID,
  "recipient_count" INTEGER NOT NULL DEFAULT 0,
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "show_in_ticker" BOOLEAN NOT NULL DEFAULT TRUE,
  "ticker_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL,

  CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "broadcasts_status_idx" ON "broadcasts"("status");
CREATE INDEX "broadcasts_audience_type_idx" ON "broadcasts"("audience_type");
CREATE INDEX "broadcasts_sent_at_idx" ON "broadcasts"("sent_at");
CREATE INDEX "broadcasts_ticker_active_status_idx" ON "broadcasts"("ticker_active", "status");

-- Phase F: public-website ticker flag (announcements shown to all visitors)
ALTER TABLE "broadcasts" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX "broadcasts_public_ticker_idx" ON "broadcasts"("is_public", "status") WHERE "is_public" = TRUE;

ALTER TABLE "broadcasts"
  ADD CONSTRAINT "broadcasts_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id"),
  ADD CONSTRAINT "broadcasts_sent_by_id_fkey"
    FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE TABLE "broadcast_recipients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "broadcast_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "notification_id" UUID,
  "delivery_status" "BroadcastDelivery" NOT NULL DEFAULT 'queued',
  "failed_reason" TEXT,
  "read_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broadcast_recipients_broadcast_id_user_id_key"
  ON "broadcast_recipients"("broadcast_id", "user_id");
CREATE INDEX "broadcast_recipients_user_id_idx" ON "broadcast_recipients"("user_id");
CREATE INDEX "broadcast_recipients_broadcast_id_idx" ON "broadcast_recipients"("broadcast_id");
CREATE INDEX "broadcast_recipients_delivery_status_idx" ON "broadcast_recipients"("delivery_status");

ALTER TABLE "broadcast_recipients"
  ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey"
    FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "broadcast_recipients_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "broadcast_recipients_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL;

-- ── Phase 10/11: notification bilingual fields + broadcast type ───────────

ALTER TABLE "notifications"
  ADD COLUMN "title_en" VARCHAR(255),
  ADD COLUMN "message_en" TEXT,
  ADD COLUMN "link_url" VARCHAR(2048);

CREATE INDEX "notifications_type_idx" ON "notifications"("type");

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'broadcast';
