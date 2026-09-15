-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE INDEX "auth_identities_provider_idx" ON "auth_identities"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_account_id_key" ON "auth_identities"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
