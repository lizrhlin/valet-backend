-- Enable extensions for geo distance calculation (earth_distance)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- AlterTable: Add geo columns to professional_profiles
ALTER TABLE "professional_profiles" ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "service_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- CreateIndex: composite index for geo queries
CREATE INDEX "professional_profiles_latitude_longitude_idx" ON "professional_profiles"("latitude", "longitude");
