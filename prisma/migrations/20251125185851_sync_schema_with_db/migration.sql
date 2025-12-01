/*
  Warnings:

  - You are about to drop the column `avgResponseTime` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastSeen` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `servicesCompleted` on the `users` table. All the data in the column will be lost.

*/

-- Drop views first (they depend on the old column names)
DROP VIEW IF EXISTS professionals CASCADE;
DROP VIEW IF EXISTS clients CASCADE;

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "avgResponseTime",
DROP COLUMN IF EXISTS "isVerified",
DROP COLUMN IF EXISTS "lastSeen",
DROP COLUMN IF EXISTS "reviewCount",
DROP COLUMN IF EXISTS "servicesCompleted",
ADD COLUMN IF NOT EXISTS "avg_response_time" INTEGER,
ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "last_seen" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "review_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "services_completed" INTEGER NOT NULL DEFAULT 0;

-- Recreate views with the correct column names
CREATE VIEW professionals AS
SELECT * FROM users WHERE "userType" = 'PROFESSIONAL';

CREATE VIEW clients AS
SELECT * FROM users WHERE "userType" = 'CLIENT';
