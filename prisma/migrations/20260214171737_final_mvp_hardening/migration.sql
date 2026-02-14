/*
  Warnings:

  - You are about to drop the column `price` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `professional_subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `suggestedMaxPrice` on the `subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `suggestedMinPrice` on the `subcategories` table. All the data in the column will be lost.
  - Added the required column `price_cents` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price_cents` to the `professional_subcategories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProfessionalOnboardingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "price",
ADD COLUMN     "price_cents" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "professional_profiles" ADD COLUMN     "onboarding_status" "ProfessionalOnboardingStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "professional_subcategories" DROP COLUMN "price",
ADD COLUMN     "price_cents" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "subcategories" DROP COLUMN "suggestedMaxPrice",
DROP COLUMN "suggestedMinPrice",
ADD COLUMN     "suggested_max_price_cents" INTEGER,
ADD COLUMN     "suggested_min_price_cents" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_version" TEXT;
