/*
  Warnings:

  - You are about to drop the column `suggested_max_price_cents` on the `subcategories` table. All the data in the column will be lost.
  - You are about to drop the column `suggested_min_price_cents` on the `subcategories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subcategories" DROP COLUMN "suggested_max_price_cents",
DROP COLUMN "suggested_min_price_cents";
