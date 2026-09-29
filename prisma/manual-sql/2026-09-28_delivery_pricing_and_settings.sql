-- UNI MART — Delivery pricing + platform settings
-- Date: 2026-09-28
--
-- This is the SQL equivalent of the schema.prisma changes for:
--   • DeliveryPartnerProfile.deliveryFee, DeliveryPartnerProfile.isAvailable
--   • DeliveryRequest.platformFee
--   • new Setting (key/value) table + seeded DELIVERY_FLAT_FEE
--
-- PRIMARY PATH (matches how this project manages its DB): just run
--     npm run db:push && npm run db:generate
-- Prisma will apply the schema.prisma changes for you and this file is optional.
--
-- This file exists for teams who prefer to apply SQL directly (psql / a managed
-- migration). It is IDEMPOTENT — safe to run more than once.

-- 1) Partner pricing + availability
ALTER TABLE "DeliveryPartnerProfile" ADD COLUMN IF NOT EXISTS "deliveryFee" DOUBLE PRECISION;
ALTER TABLE "DeliveryPartnerProfile" ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- 2) Delivery request flat-fee snapshot
ALTER TABLE "DeliveryRequest" ADD COLUMN IF NOT EXISTS "platformFee" DOUBLE PRECISION;

-- 3) Admin-adjustable settings (key/value)
CREATE TABLE IF NOT EXISTS "Setting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- Seed the flat delivery fee (₦1000) if it isn't set yet
INSERT INTO "Setting" ("key", "value", "updatedAt")
VALUES ('DELIVERY_FLAT_FEE', '1000', NOW())
ON CONFLICT ("key") DO NOTHING;
