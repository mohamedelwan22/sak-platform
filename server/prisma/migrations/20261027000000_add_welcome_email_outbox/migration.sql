CREATE TYPE "WelcomeEmailDeliveryStatus" AS ENUM ('pending', 'processing', 'sent', 'failed');

CREATE TABLE "welcome_email_deliveries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "WelcomeEmailDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider_id" VARCHAR(255),
    "last_error" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welcome_email_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "welcome_email_deliveries_user_id_key" ON "welcome_email_deliveries"("user_id");
CREATE INDEX "welcome_email_deliveries_status_next_attempt_at_idx" ON "welcome_email_deliveries"("status", "next_attempt_at");

ALTER TABLE "welcome_email_deliveries" ADD CONSTRAINT "welcome_email_deliveries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
