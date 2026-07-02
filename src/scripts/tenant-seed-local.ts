import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { LOCAL_TENANTS, upsertTenantBundle } from './tenant-script-utils';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();

  try {
    for (const tenantSeed of LOCAL_TENANTS) {
      const { tenant, area } = await upsertTenantBundle(prisma, tenantSeed);
      console.log(`Seeded tenant ${tenant.code} (${tenant.domain}) with area ${area.slug}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to seed local tenants:', error);
  process.exit(1);
});
