-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "ReviewRole" AS ENUM ('CLIENT', 'PROFESSIONAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Step 1: Create a temporary backup table for existing reviews
CREATE TABLE IF NOT EXISTS "reviews_backup" AS 
SELECT * FROM "reviews" WHERE "clientId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "professional_reviews_backup" AS 
SELECT * FROM "professional_reviews";

-- Step 2: Drop existing reviews table and recreate it with new structure
DROP TABLE IF EXISTS "reviews" CASCADE;

-- Step 3: Create new reviews table with unified structure
CREATE TABLE "reviews" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "roleFrom" "ReviewRole" NOT NULL,
  "toUserId" TEXT NOT NULL,
  "roleTo" "ReviewRole" NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "punctuality" INTEGER,
  "quality" INTEGER,
  "communication" INTEGER,
  "respectful" INTEGER,
  "payment" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- Step 4: Insert data from reviews_backup (client -> professional reviews)
INSERT INTO "reviews" (
  "id",
  "appointmentId",
  "fromUserId",
  "roleFrom",
  "toUserId",
  "roleTo",
  "rating",
  "comment",
  "punctuality",
  "quality",
  "communication",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "appointmentId",
  "clientId" as "fromUserId",
  'CLIENT'::"ReviewRole" as "roleFrom",
  "professionalId" as "toUserId",
  'PROFESSIONAL'::"ReviewRole" as "roleTo",
  "rating",
  "comment",
  "punctuality",
  "quality",
  "communication",
  "createdAt",
  "updatedAt"
FROM "reviews_backup";

-- Step 5: Insert data from professional_reviews_backup (professional -> client reviews)
INSERT INTO "reviews" (
  "id",
  "appointmentId",
  "fromUserId",
  "roleFrom",
  "toUserId",
  "roleTo",
  "rating",
  "comment",
  "punctuality",
  "respectful",
  "payment",
  "createdAt",
  "updatedAt"
)
SELECT 
  "id",
  "appointmentId",
  "professionalId" as "fromUserId",
  'PROFESSIONAL'::"ReviewRole" as "roleFrom",
  "clientId" as "toUserId",
  'CLIENT'::"ReviewRole" as "roleTo",
  "rating",
  "comment",
  "punctuality",
  "respectful",
  "payment",
  "createdAt",
  "updatedAt"
FROM "professional_reviews_backup";

-- Step 6: Drop professional_reviews table
DROP TABLE IF EXISTS "professional_reviews";

-- Step 7: Add foreign keys
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Add unique constraint for appointmentId + fromUserId
CREATE UNIQUE INDEX "reviews_appointmentId_fromUserId_key" ON "reviews"("appointmentId", "fromUserId");

-- Step 9: Create indexes
CREATE INDEX "reviews_toUserId_idx" ON "reviews"("toUserId");
CREATE INDEX "reviews_fromUserId_idx" ON "reviews"("fromUserId");
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- Step 10: Drop backup tables
DROP TABLE IF EXISTS "reviews_backup";
DROP TABLE IF EXISTS "professional_reviews_backup";
