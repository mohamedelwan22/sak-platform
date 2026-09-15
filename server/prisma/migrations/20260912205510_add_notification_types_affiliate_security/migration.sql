-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'affiliate';
ALTER TYPE "NotificationType" ADD VALUE 'security';

-- CreateIndex
CREATE INDEX "payment_requests_order_id_idx" ON "payment_requests"("order_id");
