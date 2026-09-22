-- AlterTable
ALTER TABLE "holdings" ADD COLUMN     "broker_id" UUID;

-- CreateTable
CREATE TABLE "broker_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "company" VARCHAR(150),
    "license_number" VARCHAR(100),
    "phone" VARCHAR(30),
    "bio" TEXT,
    "profile_image_url" VARCHAR(512),
    "verification_status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "rejection_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "broker_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_documents" (
    "id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150),
    "file_path" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "broker_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_relations" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "referral_code" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_commissions" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "broker_id" UUID,
    "referrer_id" UUID,
    "holding_id" UUID NOT NULL,
    "commission_type" VARCHAR(30) NOT NULL DEFAULT 'referral',
    "base_amount_usd" DECIMAL(20,8) NOT NULL,
    "rate_percent" DECIMAL(7,4) NOT NULL,
    "commission_usd" DECIMAL(20,8) NOT NULL,
    "commission_sak" DECIMAL(20,4) NOT NULL,
    "sak_price_at_calc" DECIMAL(12,4) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payout_id" UUID,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payouts" (
    "id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "total_usd" DECIMAL(20,8) NOT NULL,
    "total_sak" DECIMAL(20,4) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rates" (
    "id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "rate_percent" DECIMAL(7,4) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "broker_id" UUID,
    "land_id" UUID,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_clients" (
    "id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "broker_id" UUID,
    "client_id" UUID NOT NULL,
    "land_id" UUID,
    "source" VARCHAR(50) NOT NULL DEFAULT 'organic',
    "referral_code" VARCHAR(20),
    "status" VARCHAR(30) NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "contact_name" VARCHAR(100),
    "contact_phone" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_assignments" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "from_broker_id" UUID,
    "to_broker_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewing_requests" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "broker_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_requests" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "broker_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "holding_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribution_corrections" (
    "id" UUID NOT NULL,
    "holding_id" UUID NOT NULL,
    "old_broker_id" UUID,
    "new_broker_id" UUID,
    "reason" TEXT NOT NULL,
    "approved_by" UUID NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_types" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "description_en" TEXT,
    "description_ar" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_field_definitions" (
    "id" UUID NOT NULL,
    "asset_type_id" UUID NOT NULL,
    "field_key" VARCHAR(80) NOT NULL,
    "label_en" VARCHAR(150) NOT NULL,
    "label_ar" VARCHAR(150) NOT NULL,
    "field_type" VARCHAR(30) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_searchable" BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "validation_rules" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_field_values" (
    "id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "field_def_id" UUID NOT NULL,
    "value_text" TEXT,
    "value_number" DECIMAL(20,6),
    "value_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_configs" (
    "id" UUID NOT NULL,
    "hero_title_en" TEXT NOT NULL DEFAULT '',
    "hero_title_ar" TEXT NOT NULL DEFAULT '',
    "hero_subtitle_en" TEXT NOT NULL DEFAULT '',
    "hero_subtitle_ar" TEXT NOT NULL DEFAULT '',
    "hero_desc_en" TEXT NOT NULL DEFAULT '',
    "hero_desc_ar" TEXT NOT NULL DEFAULT '',
    "hero_image_url" VARCHAR(512),
    "hero_cta_text_en" TEXT NOT NULL DEFAULT '',
    "hero_cta_text_ar" TEXT NOT NULL DEFAULT '',
    "hero_cta_url" VARCHAR(512) NOT NULL DEFAULT '/projects',
    "hero_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broker_profiles_user_id_key" ON "broker_profiles"("user_id");

-- CreateIndex
CREATE INDEX "broker_profiles_verification_status_idx" ON "broker_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "broker_profiles_is_active_idx" ON "broker_profiles"("is_active");

-- CreateIndex
CREATE INDEX "broker_profiles_created_at_idx" ON "broker_profiles"("created_at");

-- CreateIndex
CREATE INDEX "broker_documents_broker_id_idx" ON "broker_documents"("broker_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_relations_referred_id_key" ON "affiliate_relations"("referred_id");

-- CreateIndex
CREATE INDEX "affiliate_relations_referrer_id_idx" ON "affiliate_relations"("referrer_id");

-- CreateIndex
CREATE INDEX "affiliate_relations_referral_code_idx" ON "affiliate_relations"("referral_code");

-- CreateIndex
CREATE INDEX "affiliate_commissions_beneficiary_id_idx" ON "affiliate_commissions"("beneficiary_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_broker_id_idx" ON "affiliate_commissions"("broker_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_status_idx" ON "affiliate_commissions"("status");

-- CreateIndex
CREATE INDEX "affiliate_commissions_payout_id_idx" ON "affiliate_commissions"("payout_id");

-- CreateIndex
CREATE INDEX "affiliate_commissions_created_at_idx" ON "affiliate_commissions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_holding_id_commission_type_beneficiar_key" ON "affiliate_commissions"("holding_id", "commission_type", "beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_payouts_transaction_id_key" ON "commission_payouts"("transaction_id");

-- CreateIndex
CREATE INDEX "commission_payouts_beneficiary_id_idx" ON "commission_payouts"("beneficiary_id");

-- CreateIndex
CREATE INDEX "commission_payouts_transaction_id_idx" ON "commission_payouts"("transaction_id");

-- CreateIndex
CREATE INDEX "commission_rates_type_is_default_is_active_idx" ON "commission_rates"("type", "is_default", "is_active");

-- CreateIndex
CREATE INDEX "commission_rates_broker_id_idx" ON "commission_rates"("broker_id");

-- CreateIndex
CREATE INDEX "commission_rates_effective_from_idx" ON "commission_rates"("effective_from");

-- CreateIndex
CREATE INDEX "broker_clients_broker_id_idx" ON "broker_clients"("broker_id");

-- CreateIndex
CREATE INDEX "broker_clients_client_id_idx" ON "broker_clients"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "broker_clients_broker_id_client_id_key" ON "broker_clients"("broker_id", "client_id");

-- CreateIndex
CREATE INDEX "leads_broker_id_idx" ON "leads"("broker_id");

-- CreateIndex
CREATE INDEX "leads_client_id_idx" ON "leads"("client_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "lead_assignments_lead_id_idx" ON "lead_assignments"("lead_id");

-- CreateIndex
CREATE INDEX "lead_assignments_to_broker_id_idx" ON "lead_assignments"("to_broker_id");

-- CreateIndex
CREATE INDEX "viewing_requests_lead_id_idx" ON "viewing_requests"("lead_id");

-- CreateIndex
CREATE INDEX "viewing_requests_land_id_idx" ON "viewing_requests"("land_id");

-- CreateIndex
CREATE INDEX "viewing_requests_broker_id_idx" ON "viewing_requests"("broker_id");

-- CreateIndex
CREATE INDEX "viewing_requests_status_idx" ON "viewing_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "booking_requests_holding_id_key" ON "booking_requests"("holding_id");

-- CreateIndex
CREATE INDEX "booking_requests_lead_id_idx" ON "booking_requests"("lead_id");

-- CreateIndex
CREATE INDEX "booking_requests_land_id_idx" ON "booking_requests"("land_id");

-- CreateIndex
CREATE INDEX "booking_requests_broker_id_idx" ON "booking_requests"("broker_id");

-- CreateIndex
CREATE INDEX "booking_requests_status_idx" ON "booking_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attribution_corrections_holding_id_key" ON "attribution_corrections"("holding_id");

-- CreateIndex
CREATE INDEX "attribution_corrections_holding_id_idx" ON "attribution_corrections"("holding_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_types_slug_key" ON "asset_types"("slug");

-- CreateIndex
CREATE INDEX "asset_types_is_active_idx" ON "asset_types"("is_active");

-- CreateIndex
CREATE INDEX "asset_field_definitions_asset_type_id_idx" ON "asset_field_definitions"("asset_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_field_definitions_asset_type_id_field_key_key" ON "asset_field_definitions"("asset_type_id", "field_key");

-- CreateIndex
CREATE INDEX "asset_field_values_land_id_idx" ON "asset_field_values"("land_id");

-- CreateIndex
CREATE INDEX "asset_field_values_field_def_id_idx" ON "asset_field_values"("field_def_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_field_values_land_id_field_def_id_key" ON "asset_field_values"("land_id", "field_def_id");

-- CreateIndex
CREATE INDEX "holdings_broker_id_idx" ON "holdings"("broker_id");

-- AddForeignKey
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_documents" ADD CONSTRAINT "broker_documents_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "broker_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_relations" ADD CONSTRAINT "affiliate_relations_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_relations" ADD CONSTRAINT "affiliate_relations_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "broker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "commission_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rates" ADD CONSTRAINT "commission_rates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_clients" ADD CONSTRAINT "broker_clients_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "broker_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_clients" ADD CONSTRAINT "broker_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "broker_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewing_requests" ADD CONSTRAINT "viewing_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_corrections" ADD CONSTRAINT "attribution_corrections_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "holdings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribution_corrections" ADD CONSTRAINT "attribution_corrections_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_types" ADD CONSTRAINT "asset_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_definitions" ADD CONSTRAINT "asset_field_definitions_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "asset_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_values" ADD CONSTRAINT "asset_field_values_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "lands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_field_values" ADD CONSTRAINT "asset_field_values_field_def_id_fkey" FOREIGN KEY ("field_def_id") REFERENCES "asset_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_configs" ADD CONSTRAINT "homepage_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
