import * as dotenv from 'dotenv';
import { getRequestedTenantCodes } from './tenant-data-seed-utils';
import { getTenantData } from './seed-data/tenants';
import { seedTenantPlaces } from './tenant-data-seed-utils';

dotenv.config();

async function main() {
  for (const code of getRequestedTenantCodes()) {
    await seedTenantPlaces(getTenantData(code));
  }
}

main().catch((error) => {
  console.error('Failed to seed tenant places:', error);
  process.exit(1);
});
