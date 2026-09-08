-- CreateSequence
-- Sequence for SAK account numbers (6-digit suffix, starting at 082419)
CREATE SEQUENCE "sak_account_number_seq" START WITH 82419;

-- AlterTable
-- Add account_number as nullable first so existing rows can be backfilled
ALTER TABLE "users" ADD COLUMN "account_number" VARCHAR(9);

-- Backfill existing users with stable, sequential account numbers (SAK + 6 digits)
UPDATE "users"
SET "account_number" = 'SAK' || lpad(nextval('sak_account_number_seq')::text, 6, '0')
WHERE "account_number" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_account_number_key" ON "users"("account_number");

-- SetNotNull
ALTER TABLE "users" ALTER COLUMN "account_number" SET NOT NULL;

-- DataBackfill
-- Pre-existing active accounts are trusted to have verified email on signup
UPDATE "users" SET "email_verified" = true WHERE "status" = 'active' AND "email_verified" = false;

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;