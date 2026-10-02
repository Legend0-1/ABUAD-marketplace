-- UNI MART — Multi-country registration: user country + institution
-- Date: 2026-10-01
--
-- This is the SQL equivalent of the schema.prisma changes adding three fields to
-- the User model:
--   • country          — ISO alpha-2 code the student registered under (e.g. "NG")
--   • institution      — the institution name (a catalog name, or a typed "Other")
--   • institutionType  — the catalog category (e.g. "Federal University"), or NULL
--                        for an "Other"/free-typed institution
--
-- All three are additive and NULLABLE, so this is safe to apply to an existing
-- database with no data migration — existing users simply have NULLs.
--
-- PRIMARY PATH (matches how this project manages its DB): just run
--     npm run db:push && npm run db:generate
-- Prisma will apply the schema.prisma changes for you and this file is optional.
--
-- This file exists for teams who prefer to apply SQL directly (psql / a managed
-- migration). It is IDEMPOTENT — safe to run more than once.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "institution" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "institutionType" TEXT;
