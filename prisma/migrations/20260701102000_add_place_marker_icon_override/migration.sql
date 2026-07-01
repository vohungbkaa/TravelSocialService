ALTER TABLE "Place" ADD COLUMN "markerIconId" INTEGER;

CREATE INDEX "Place_markerIconId_idx" ON "Place"("markerIconId");

ALTER TABLE "Place" ADD CONSTRAINT "Place_markerIconId_fkey"
FOREIGN KEY ("markerIconId") REFERENCES "MarkerIcon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
