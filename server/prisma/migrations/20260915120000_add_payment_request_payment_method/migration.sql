-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN "payment_method_id" UUID;

-- CreateIndex
CREATE INDEX "payment_requests_payment_method_id_idx" ON "payment_requests"("payment_method_id");

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;