/*
  Warnings:

  - You are about to drop the column `userId` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `professionalId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `subcategoryId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `professionalId` on the `custom_availability` table. All the data in the column will be lost.
  - You are about to drop the column `professionalId` on the `favorites` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `favorites` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `professional_categories` table. All the data in the column will be lost.
  - You are about to drop the column `professionalId` on the `professional_categories` table. All the data in the column will be lost.
  - You are about to drop the column `professionalId` on the `professional_subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `subcategoryId` on the `professional_subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `appointmentId` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `communication` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `fromUserId` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `payment` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `punctuality` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `quality` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `respectful` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `toUserId` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `available` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_verified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `review_count` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `services_completed` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `specialty` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `availability` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[professional_id,date,timeSlot]` on the table `custom_availability` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,professional_id]` on the table `favorites` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[professional_id,category_id]` on the table `professional_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[professional_id,subcategory_id]` on the table `professional_subcategories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointment_id,from_user_id]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professional_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subcategory_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professional_id` to the `custom_availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professional_id` to the `favorites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `favorites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category_id` to the `professional_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professional_id` to the `professional_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `professional_id` to the `professional_subcategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subcategory_id` to the `professional_subcategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `appointment_id` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `from_user_id` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_user_id` to the `reviews` table without a default value. This is not possible if the table is not empty.

*/
-- Drop views that depend on users columns
DROP VIEW IF EXISTS professionals CASCADE;
DROP VIEW IF EXISTS clients CASCADE;
DROP VIEW IF EXISTS all_users CASCADE;

-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_userId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_addressId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_subcategoryId_fkey";

-- DropForeignKey
ALTER TABLE "availability" DROP CONSTRAINT "availability_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "custom_availability" DROP CONSTRAINT "custom_availability_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "professional_categories" DROP CONSTRAINT "professional_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "professional_categories" DROP CONSTRAINT "professional_categories_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "professional_subcategories" DROP CONSTRAINT "professional_subcategories_professionalId_fkey";

-- DropForeignKey
ALTER TABLE "professional_subcategories" DROP CONSTRAINT "professional_subcategories_subcategoryId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_toUserId_fkey";

-- DropIndex
DROP INDEX "addresses_userId_idx";

-- DropIndex
DROP INDEX "appointments_clientId_idx";

-- DropIndex
DROP INDEX "appointments_professionalId_idx";

-- DropIndex
DROP INDEX "appointments_subcategoryId_idx";

-- DropIndex
DROP INDEX "custom_availability_professionalId_date_timeSlot_key";

-- DropIndex
DROP INDEX "custom_availability_professionalId_idx";

-- DropIndex
DROP INDEX "favorites_professionalId_idx";

-- DropIndex
DROP INDEX "favorites_userId_idx";

-- DropIndex
DROP INDEX "favorites_userId_professionalId_key";

-- DropIndex
DROP INDEX "notifications_userId_idx";

-- DropIndex
DROP INDEX "professional_categories_categoryId_idx";

-- DropIndex
DROP INDEX "professional_categories_professionalId_categoryId_key";

-- DropIndex
DROP INDEX "professional_categories_professionalId_idx";

-- DropIndex
DROP INDEX "professional_subcategories_professionalId_idx";

-- DropIndex
DROP INDEX "professional_subcategories_professionalId_subcategoryId_key";

-- DropIndex
DROP INDEX "professional_subcategories_subcategoryId_idx";

-- DropIndex
DROP INDEX "reviews_appointmentId_fromUserId_key";

-- DropIndex
DROP INDEX "reviews_fromUserId_idx";

-- DropIndex
DROP INDEX "reviews_toUserId_idx";

-- DropIndex
DROP INDEX "users_available_idx";

-- DropIndex
DROP INDEX "users_location_idx";

-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "addressId",
DROP COLUMN "clientId",
DROP COLUMN "professionalId",
DROP COLUMN "subcategoryId",
ADD COLUMN     "address_id" TEXT NOT NULL,
ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "professional_id" TEXT NOT NULL,
ADD COLUMN     "subcategory_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "custom_availability" DROP COLUMN "professionalId",
ADD COLUMN     "professional_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "favorites" DROP COLUMN "professionalId",
DROP COLUMN "userId",
ADD COLUMN     "professional_id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "professional_categories" DROP COLUMN "categoryId",
DROP COLUMN "professionalId",
ADD COLUMN     "category_id" INTEGER NOT NULL,
ADD COLUMN     "professional_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "professional_subcategories" DROP COLUMN "professionalId",
DROP COLUMN "subcategoryId",
ADD COLUMN     "professional_id" TEXT NOT NULL,
ADD COLUMN     "subcategory_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "appointmentId",
DROP COLUMN "communication",
DROP COLUMN "fromUserId",
DROP COLUMN "payment",
DROP COLUMN "punctuality",
DROP COLUMN "quality",
DROP COLUMN "respectful",
DROP COLUMN "toUserId",
ADD COLUMN     "appointment_id" TEXT NOT NULL,
ADD COLUMN     "from_user_id" TEXT NOT NULL,
ADD COLUMN     "to_user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "available",
DROP COLUMN "description",
DROP COLUMN "experience",
DROP COLUMN "is_verified",
DROP COLUMN "latitude",
DROP COLUMN "location",
DROP COLUMN "longitude",
DROP COLUMN "rating",
DROP COLUMN "review_count",
DROP COLUMN "services_completed",
DROP COLUMN "specialty";

-- DropTable
DROP TABLE "availability";

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "primary_category_id" INTEGER,
    "experience_range" TEXT,
    "description" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "services_completed" INTEGER NOT NULL DEFAULT 0,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_user_id_key" ON "professional_profiles"("user_id");

-- CreateIndex
CREATE INDEX "professional_profiles_user_id_idx" ON "professional_profiles"("user_id");

-- CreateIndex
CREATE INDEX "professional_profiles_primary_category_id_idx" ON "professional_profiles"("primary_category_id");

-- CreateIndex
CREATE INDEX "professional_profiles_is_available_idx" ON "professional_profiles"("is_available");

-- CreateIndex
CREATE INDEX "professional_profiles_is_verified_idx" ON "professional_profiles"("is_verified");

-- Recreate views
CREATE VIEW professionals AS
SELECT * FROM users WHERE "userType" = 'PROFESSIONAL';

CREATE VIEW clients AS
SELECT * FROM users WHERE "userType" = 'CLIENT';

CREATE VIEW all_users AS
SELECT * FROM users;

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "appointments_client_id_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_professional_id_idx" ON "appointments"("professional_id");

-- CreateIndex
CREATE INDEX "appointments_subcategory_id_idx" ON "appointments"("subcategory_id");

-- CreateIndex
CREATE INDEX "custom_availability_professional_id_idx" ON "custom_availability"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_availability_professional_id_date_timeSlot_key" ON "custom_availability"("professional_id", "date", "timeSlot");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_professional_id_idx" ON "favorites"("professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_professional_id_key" ON "favorites"("user_id", "professional_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "professional_categories_professional_id_idx" ON "professional_categories"("professional_id");

-- CreateIndex
CREATE INDEX "professional_categories_category_id_idx" ON "professional_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_categories_professional_id_category_id_key" ON "professional_categories"("professional_id", "category_id");

-- CreateIndex
CREATE INDEX "professional_subcategories_professional_id_idx" ON "professional_subcategories"("professional_id");

-- CreateIndex
CREATE INDEX "professional_subcategories_subcategory_id_idx" ON "professional_subcategories"("subcategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_subcategories_professional_id_subcategory_id_key" ON "professional_subcategories"("professional_id", "subcategory_id");

-- CreateIndex
CREATE INDEX "reviews_to_user_id_idx" ON "reviews"("to_user_id");

-- CreateIndex
CREATE INDEX "reviews_from_user_id_idx" ON "reviews"("from_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_appointment_id_from_user_id_key" ON "reviews"("appointment_id", "from_user_id");

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_categories" ADD CONSTRAINT "professional_categories_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_categories" ADD CONSTRAINT "professional_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_subcategories" ADD CONSTRAINT "professional_subcategories_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_subcategories" ADD CONSTRAINT "professional_subcategories_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_client" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_professional" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_from_user" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_to_user" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_professional" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_availability" ADD CONSTRAINT "custom_availability_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
