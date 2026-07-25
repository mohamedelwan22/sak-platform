-- CreateEnum
CREATE TYPE "ProfitPayoutStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'profit';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'profit_distribution';

-- CreateTable
CREATE TABLE "profit_distributions" (
    "id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "total_profit_usd" DECIMAL(20,8) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "distributed_by" UUID NOT NULL,
    "distributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_payouts" (
    "id" UUID NOT NULL,
    "distribution_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "holding_id" UUID NOT NULL,
    "ownership_percent" DECIMAL(8,4) NOT NULL,
    "payout_usd" DECIMAL(20,8) NOT NULL,
    "payout_sak" DECIMAL(20,4) NOT NULL,
    "status" "ProfitPayoutStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profit_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "holding_id" UUID NOT NULL,
    "file_path" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_distributions_land_id_idx" ON "profit_distributions"("land_id");

-- CreateIndex
CREATE INDEX "profit_distributions_distributed_at_idx" ON "profit_distributions"("distributed_at");

-- CreateIndex
CREATE INDEX "profit_payouts_distribution_id_idx" ON "profit_payouts"("distribution_id");

-- CreateIndex
CREATE INDEX "profit_payouts_user_id_idx" ON "profit_payouts"("user_id");

-- CreateIndex
CREATE INDEX "profit_payouts_holding_id_idx" ON "profit_payouts"("holding_id");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "certificates"("user_id");

-- CreateIndex
CREATE INDEX "certificates_holding_id_idx" ON "certificates"("holding_id");

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_distributed_by_fkey" FOREIGN KEY ("distributed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "profit_distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_payouts" ADD CONSTRAINT "profit_payouts_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
