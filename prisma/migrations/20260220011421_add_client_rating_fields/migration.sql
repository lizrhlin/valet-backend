-- AlterTable
ALTER TABLE "users" ADD COLUMN     "client_rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "client_review_count" INTEGER NOT NULL DEFAULT 0;

-- RenameIndex
ALTER INDEX "idx_favorites_professional" RENAME TO "favorites_professional_id_idx";

-- RenameIndex
ALTER INDEX "idx_favorites_user" RENAME TO "favorites_user_id_idx";
