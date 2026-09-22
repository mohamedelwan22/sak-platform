-- CreateTable
CREATE TABLE "investment_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "broker_id" UUID,
    "amount_usd" DECIMAL(20,8) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'platform',
    "status" VARCHAR(30) NOT NULL DEFAULT 'submitted',
    "review_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "holding_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_requests_holding_id_key" ON "investment_requests"("holding_id");

-- CreateIndex
CREATE INDEX "investment_requests_user_id_idx" ON "investment_requests"("user_id");

-- CreateIndex
CREATE INDEX "investment_requests_land_id_idx" ON "investment_requests"("land_id");

-- CreateIndex
CREATE INDEX "investment_requests_broker_id_idx" ON "investment_requests"("broker_id");

-- CreateIndex
CREATE INDEX "investment_requests_status_idx" ON "investment_requests"("status");

-- CreateIndex
CREATE INDEX "investment_requests_created_at_idx" ON "investment_requests"("created_at");

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "broker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_requests" ADD CONSTRAINT "investment_requests_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
