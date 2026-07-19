INSERT INTO "TenantUser" (
  "id",
  "tenantId",
  "userId",
  "role",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  tenant."id",
  app_user."id",
  'VIEWER'::"TenantUserRole",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant" AS tenant
CROSS JOIN "User" AS app_user
WHERE tenant."code" = 'tien-thang'
  AND tenant."enabled" = true
  AND app_user."status" = 'ACTIVE'
  AND app_user."role" = 'USER'
  AND NOT EXISTS (
    SELECT 1
    FROM "TenantUser" AS membership
    WHERE membership."tenantId" = tenant."id"
      AND membership."userId" = app_user."id"
  );
