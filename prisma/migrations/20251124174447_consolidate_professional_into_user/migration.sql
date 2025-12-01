/*
  Warnings:

  - You are about to drop the `professionals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "availability" DROP CONSTRAINT "availability_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "professional_categories" DROP CONSTRAINT "professional_categories_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "professional_subcategories" DROP CONSTRAINT "professional_subcategories_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "professionals" DROP CONSTRAINT "professionals_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avgResponseTime" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "servicesCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "specialty" TEXT;

-- DropTable
DROP TABLE "professionals";

-- CreateIndex
CREATE INDEX "users_location_idx" ON "users"("location");

-- CreateIndex
CREATE INDEX "users_available_idx" ON "users"("available");

-- AddForeignKey
ALTER TABLE "professional_categories" ADD CONSTRAINT "professional_categories_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_subcategories" ADD CONSTRAINT "professional_subcategories_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
