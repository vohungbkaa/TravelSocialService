import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { getEnv, getOptionalEnv, upsertTenantBundle } from './tenant-script-utils';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  const code = getEnv('TENANT_CODE').toLowerCase();
  const name = getEnv('TENANT_NAME');
  const domain = getEnv('TENANT_DOMAIN').toLowerCase();

  try {
    const { tenant, area } = await upsertTenantBundle(prisma, {
      code,
      name,
      domain,
      theme: { primaryColor: getOptionalEnv('TENANT_PRIMARY_COLOR') || '#10b981', logoUrl: getOptionalEnv('TENANT_LOGO_URL') || null },
      settings: { defaultAreaSlug: getOptionalEnv('TENANT_AREA_SLUG') || code },
      area: {
        slug: getOptionalEnv('TENANT_AREA_SLUG') || code,
        name: getOptionalEnv('TENANT_AREA_NAME') || name,
        provinceCode: getOptionalEnv('TENANT_PROVINCE_CODE'),
        description: getOptionalEnv('TENANT_DESCRIPTION'),
        centerLat: Number(getEnv('TENANT_CENTER_LAT', '16.068501')),
        centerLng: Number(getEnv('TENANT_CENTER_LNG', '108.2240242')),
        defaultRadiusKm: Number(getEnv('TENANT_RADIUS_KM', '3')),
        published: getOptionalEnv('TENANT_AREA_PUBLISHED') !== 'false',
      },
    });

    console.log(`Tenant ready: ${tenant.code} (${tenant.domain}), area=${area.slug}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to create tenant:', error);
  process.exit(1);
});
