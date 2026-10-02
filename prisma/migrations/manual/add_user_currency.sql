-- Seller dashboard: per-user display currency preference.
-- Additive and nullable, so it is safe to apply to an existing database with
-- no data migration. NULL means the user sees figures in Nigerian Naira (NGN),
-- which is how all amounts are stored. This only affects display.
--
-- If you use `npx prisma db push` (this project's normal workflow) you do NOT
-- need to run this file by hand — db push will add the column. It is provided
-- for environments that apply raw SQL migrations instead.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currency" TEXT;
