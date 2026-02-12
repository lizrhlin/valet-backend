-- Remove detailed rating columns from reviews table
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "punctuality";
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "quality";
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "communication";
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "respectful";
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "payment";
