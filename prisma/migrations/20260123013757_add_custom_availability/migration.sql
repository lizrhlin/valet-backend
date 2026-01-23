-- CreateTable
CREATE TABLE "custom_availability" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_availability_professionalId_idx" ON "custom_availability"("professionalId");

-- CreateIndex
CREATE INDEX "custom_availability_date_idx" ON "custom_availability"("date");

-- CreateIndex
CREATE UNIQUE INDEX "custom_availability_professionalId_date_timeSlot_key" ON "custom_availability"("professionalId", "date", "timeSlot");

-- AddForeignKey
ALTER TABLE "custom_availability" ADD CONSTRAINT "custom_availability_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
