-- Optional per-asset external links (Phase 6 final fix).
-- public_details_url already exists; this adds an optional Google Maps URL.

-- AlterTable
ALTER TABLE "lands" ADD COLUMN "google_maps_url" VARCHAR(2048);