-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "rate_used_at_request" DECIMAL(12,4);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "direction" VARCHAR(20) NOT NULL DEFAULT 'debit',
ADD COLUMN     "fees_sak" DECIMAL(20,4),
ADD COLUMN     "fees_usd" DECIMAL(20,8),
ADD COLUMN     "holding_id" UUID,
ADD COLUMN     "payment_request_id" UUID,
ADD COLUMN     "price_per_sak_usd" DECIMAL(12,4),
ADD COLUMN     "sak_amount" DECIMAL(20,4),
ADD COLUMN     "unit" VARCHAR(20) NOT NULL DEFAULT 'SAK',
ADD COLUMN     "usd_amount" DECIMAL(20,8);

-- CreateIndex
CREATE INDEX "transactions_payment_request_id_idx" ON "transactions"("payment_request_id");

-- CreateIndex
CREATE INDEX "transactions_holding_id_idx" ON "transactions"("holding_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
