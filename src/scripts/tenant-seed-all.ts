import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getTenantData } from './seed-data/tenants';
import {
  getRequestedTenantCodes,
  seedTenantAdmins,
  seedTenantBase,
  seedTenantCategories,
  seedTenantPlaces,
} from './tenant-data-seed-utils';

dotenv.config();

async function main() {
  for (const code of getRequestedTenantCodes()) {
    const seed = getTenantData(code);
    const prisma = new PrismaClient();
    try {
      await seedTenantBase(prisma, seed);
      await seedTenantAdmins(prisma, seed);
      await seedTenantCategories(prisma, seed);
    } finally {
      await prisma.$disconnect();
    }
    await seedTenantPlaces(seed);
  }
}

main().catch((error) => {
  console.error('Failed to seed all tenant data:', error);
  process.exit(1);
});
