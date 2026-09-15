-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN "order_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_order_id_key" ON "payment_requests"("order_id");

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;