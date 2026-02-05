-- CreateTable
CREATE TABLE "professional_reviews" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "punctuality" INTEGER,
    "respectful" INTEGER,
    "payment" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_reviews_appointmentId_key" ON "professional_reviews"("appointmentId");

-- CreateIndex
CREATE INDEX "professional_reviews_clientId_idx" ON "professional_reviews"("clientId");

-- CreateIndex
CREATE INDEX "professional_reviews_professionalId_idx" ON "professional_reviews"("professionalId");

-- CreateIndex
CREATE INDEX "professional_reviews_rating_idx" ON "professional_reviews"("rating");

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_reviews" ADD CONSTRAINT "professional_reviews_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
