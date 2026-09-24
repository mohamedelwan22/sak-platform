-- Fix: Add the missing public_details_url column to lands.
-- The Prisma schema declares it but no migration created it, causing
-- `prisma.land.findMany()` to fail with P2022 (column does not exist).
ALTER TABLE "lands" ADD COLUMN "public_details_url" VARCHAR(2048);