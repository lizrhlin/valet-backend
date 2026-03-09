-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_COMPLETED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "appointment_id" TEXT;

-- CreateIndex
CREATE INDEX "notifications_appointment_id_idx" ON "notifications"("appointment_id");
