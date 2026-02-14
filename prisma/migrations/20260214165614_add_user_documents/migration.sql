/*
  Warnings:

  - You are about to drop the column `verificationDocs` on the `users` table. All the data in the column will be lost.

*/
-- Drop dependent views
DROP VIEW IF EXISTS professionals CASCADE;
DROP VIEW IF EXISTS clients CASCADE;
DROP VIEW IF EXISTS all_users CASCADE;

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SELFIE_WITH_DOCUMENT', 'ID_DOCUMENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "verificationDocs";

-- CreateTable
CREATE TABLE "user_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_documents_user_id_idx" ON "user_documents"("user_id");

-- CreateIndex
CREATE INDEX "user_documents_type_idx" ON "user_documents"("type");

-- CreateIndex
CREATE INDEX "user_documents_status_idx" ON "user_documents"("status");

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate views
CREATE VIEW "professionals" AS
SELECT u.id, u.email, u.name, u.phone, u.avatar, u.status, u."userType", u.cpf, u."notificationsEnabled", u.language, u."createdAt", u."updatedAt"
FROM users u
WHERE u."userType" = 'PROFESSIONAL';

CREATE VIEW "clients" AS
SELECT u.id, u.email, u.name, u.phone, u.avatar, u.status, u."userType", u.cpf, u."notificationsEnabled", u.language, u."createdAt", u."updatedAt"
FROM users u
WHERE u."userType" = 'CLIENT';

CREATE VIEW "all_users" AS
SELECT u.id, u.email, u.name, u.phone, u.avatar, u.status, u."userType", u.cpf, u."notificationsEnabled", u.language, u."createdAt", u."updatedAt"
FROM users u;
