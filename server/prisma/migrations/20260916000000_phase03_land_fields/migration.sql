-- Phase 03: Add PRD-required land fields (use_type, cultivation_status, acquisition_date)
ALTER TABLE "lands" ADD COLUMN "use_type" VARCHAR(50);

ALTER TABLE "lands" ADD COLUMN "cultivation_status" VARCHAR(50);

ALTER TABLE "lands" ADD COLUMN "acquisition_date" DATE;

-- Indexes for the new public filters
CREATE INDEX "lands_asset_type_idx" ON "lands"("asset_type");

CREATE INDEX "lands_country_idx" ON "lands"("country");