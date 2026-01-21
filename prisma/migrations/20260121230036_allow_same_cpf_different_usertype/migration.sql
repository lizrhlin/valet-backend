/*
  Warnings:

  - A unique constraint covering the columns `[cpf,userType]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_cpf_key";

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_userType_key" ON "users"("cpf", "userType");
