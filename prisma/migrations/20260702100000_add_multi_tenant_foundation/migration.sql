-- CreateEnum
CREATE TYPE "TenantUserRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MapLayerType" AS ENUM ('BOUNDARY', 'MASK', 'ROUTE', 'CUSTOM');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "theme" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantUserRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantFeature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMapLayer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "areaId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MapLayerType" NOT NULL DEFAULT 'BOUNDARY',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "geoJson" JSONB,
    "geoJsonUrl" TEXT,
    "style" JSONB,
    "bounds" JSONB,
    "centerLat" DECIMAL(65,30),
    "centerLng" DECIMAL(65,30),
    "zoom" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMapLayer_pkey" PRIMARY KEY ("id")
);

-- Create tenant unique indexes before default seed uses ON CONFLICT.
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- Seed the existing single-tenant data into the default Tien Thang tenant.
INSERT INTO "Tenant" ("id", "code", "name", "domain", "enabled", "theme", "settings")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'tien-thang',
    'Xã Tiến Thắng',
    'tien-thang.localhost',
    true,
    '{"primaryColor":"#10b981","logoUrl":null}'::jsonb,
    '{"defaultAreaSlug":"tien-thang"}'::jsonb
)
ON CONFLICT ("code") DO NOTHING;

-- Add tenant columns as nullable first so existing rows can be backfilled safely.
ALTER TABLE "Area" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Place" ADD COLUMN "tenantId" TEXT;

UPDATE "Area"
SET "tenantId" = '00000000-0000-4000-8000-000000000001'
WHERE "tenantId" IS NULL;

UPDATE "Place"
SET "tenantId" = COALESCE(
    (SELECT "Area"."tenantId" FROM "Area" WHERE "Area"."id" = "Place"."areaId"),
    '00000000-0000-4000-8000-000000000001'
)
WHERE "tenantId" IS NULL;

ALTER TABLE "Area" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Place" ALTER COLUMN "tenantId" SET NOT NULL;

-- Replace global slug uniqueness with tenant-scoped uniqueness.
DROP INDEX IF EXISTS "Area_slug_key";
DROP INDEX IF EXISTS "Place_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_tenantId_userId_key" ON "TenantUser"("tenantId", "userId");
CREATE INDEX "TenantUser_userId_active_idx" ON "TenantUser"("userId", "active");
CREATE INDEX "TenantUser_tenantId_active_idx" ON "TenantUser"("tenantId", "active");
CREATE UNIQUE INDEX "TenantFeature_tenantId_feature_key" ON "TenantFeature"("tenantId", "feature");
CREATE INDEX "TenantFeature_feature_idx" ON "TenantFeature"("feature");
CREATE UNIQUE INDEX "Area_tenantId_slug_key" ON "Area"("tenantId", "slug");
CREATE INDEX "Area_tenantId_published_idx" ON "Area"("tenantId", "published");
CREATE UNIQUE INDEX "TenantMapLayer_tenantId_key_key" ON "TenantMapLayer"("tenantId", "key");
CREATE INDEX "TenantMapLayer_tenantId_enabled_sortOrder_idx" ON "TenantMapLayer"("tenantId", "enabled", "sortOrder");
CREATE INDEX "TenantMapLayer_areaId_idx" ON "TenantMapLayer"("areaId");
CREATE UNIQUE INDEX "Place_tenantId_slug_key" ON "Place"("tenantId", "slug");
CREATE INDEX "Place_tenantId_status_createdAt_idx" ON "Place"("tenantId", "status", "createdAt");
CREATE INDEX "Place_tenantId_areaId_sortOrder_idx" ON "Place"("tenantId", "areaId", "sortOrder");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantFeature" ADD CONSTRAINT "TenantFeature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Area" ADD CONSTRAINT "Area_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMapLayer" ADD CONSTRAINT "TenantMapLayer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMapLayer" ADD CONSTRAINT "TenantMapLayer_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
