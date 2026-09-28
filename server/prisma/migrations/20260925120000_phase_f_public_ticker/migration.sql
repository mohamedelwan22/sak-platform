-- Delta migration: Phase F — public-website ticker flag.
-- Applied manually via prisma db execute (dev DB drift-managed pattern),
-- then recorded with prisma migrate resolve --applied 20260925120000_phase_f_public_ticker.

ALTER TABLE "broadcasts" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX "broadcasts_public_ticker_idx" ON "broadcasts"("is_public", "status") WHERE "is_public" = TRUE;
