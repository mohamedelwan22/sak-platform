-- Phase 07: Gold & SAK Market — extend gold_price_history
-- Adds per-ounce price, per-gram price, currency, provider timestamp, and fetch timestamp.
-- The existing gram_price_usd column is preserved for backward compatibility.

ALTER TABLE "gold_price_history"
  ADD COLUMN "price_per_ounce" DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "price_per_gram" DECIMAL(12, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  ADD COLUMN "source_updated_at" TIMESTAMP,
  ADD COLUMN "fetched_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows: derive ounce price from gram price.
-- 1 troy ounce = 31.1034768 grams  =>  pricePerOunce = pricePerGram * 31.1034768
UPDATE "gold_price_history"
SET
  "price_per_gram" = "gram_price_usd",
  "price_per_ounce" = ROUND("gram_price_usd" * 31.1034768, 4),
  "currency" = 'USD',
  "fetched_at" = "created_at";

-- Drop the default now that backfill is done (keep nullable for future migrations).
ALTER TABLE "gold_price_history"
  ALTER COLUMN "price_per_ounce" DROP DEFAULT,
  ALTER COLUMN "price_per_gram" DROP DEFAULT,
  ALTER COLUMN "currency" DROP DEFAULT,
  ALTER COLUMN "fetched_at" DROP DEFAULT;

-- Indexes for market history queries.
CREATE INDEX "gold_price_history_fetched_at_idx" ON "gold_price_history"("fetched_at");
CREATE INDEX "gold_price_history_source_idx" ON "gold_price_history"("source");

-- Phase 07: immutable market-price snapshot stored at transaction/order time.
-- Contains: goldPricePerOunce, goldPricePerGram, sakPriceUSD, goldWeightGramsPerSak,
-- quantity, currency, priceTimestamp, source, isStale.
ALTER TABLE "transactions"
  ADD COLUMN "price_snapshot" JSONB;

ALTER TABLE "orders"
  ADD COLUMN "price_snapshot" JSONB;