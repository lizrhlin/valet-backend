-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "hidden_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "notifications_hidden_at_idx" ON "notifications"("hidden_at");
