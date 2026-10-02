-- UNI MART — Campus scoping for storefronts
-- Date: 2026-10-02
--
-- Adds two columns to the Storefront model so marketplace listings can be
-- scoped by campus:
--   • campus      — the human-readable primary campus (the owner's institution)
--   • campusKeys  — the set of normalized campus keys this storefront is visible
--                   to (the primary one, plus any an admin adds). A viewer sees
--                   a listing only when their own campus key is in this array.
--
-- Both are additive: `campus` is NULLABLE and `campusKeys` DEFAULTS to an empty
-- array, so this is safe to apply to an existing database with no downtime and
-- no required data migration.
--
-- PRIMARY PATH (matches how this project manages its DB): just run
--     npm run db:push && npm run db:generate
-- Prisma applies the schema.prisma changes for you and this file is optional.
--
-- This file exists for teams who prefer to apply SQL directly (psql / a managed
-- migration). It is IDEMPOTENT — safe to run more than once.

ALTER TABLE "Storefront" ADD COLUMN IF NOT EXISTS "campus" TEXT;
ALTER TABLE "Storefront" ADD COLUMN IF NOT EXISTS "campusKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Speeds up the `campusKeys: { has: <key> }` filter the product/search queries
-- use. Safe to run repeatedly.
CREATE INDEX IF NOT EXISTS "Storefront_campusKeys_idx" ON "Storefront" USING GIN ("campusKeys");
