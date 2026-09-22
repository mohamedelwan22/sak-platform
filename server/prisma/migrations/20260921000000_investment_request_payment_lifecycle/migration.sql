-- Task 6: attach a manual payment lifecycle to investment requests.
-- An investment request only becomes an executed investment (holding) after
-- payment proof is uploaded, confirmed by an admin, and the request is approved.

-- AlterTable
ALTER TABLE "investment_requests" ADD COLUMN     "payment_status" VARCHAR(30) NOT NULL DEFAULT 'payment_pending',
ADD COLUMN     "payment_method" VARCHAR(50),
ADD COLUMN     "payment_proof_path" TEXT,
ADD COLUMN     "payment_proof_uploaded_at" TIMESTAMP(3),
ADD COLUMN     "payment_reviewed_by" UUID,
ADD COLUMN     "payment_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "payment_note" TEXT,
ADD COLUMN     "rejection_reason" TEXT;

-- CreateIndex
CREATE INDEX "investment_requests_payment_status_idx" ON "investment_requests"("payment_status");

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_payment_reviewed_by_fkey" FOREIGN KEY ("payment_reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
