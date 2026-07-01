CREATE TABLE "MarkerIcon" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT NOT NULL,
    "markerColor" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarkerIcon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarkerIcon_key_key" ON "MarkerIcon"("key");

ALTER TABLE "PlaceCategory" ADD COLUMN "markerIconId" INTEGER;

ALTER TABLE "PlaceCategory" ADD CONSTRAINT "PlaceCategory_markerIconId_fkey"
FOREIGN KEY ("markerIconId") REFERENCES "MarkerIcon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
