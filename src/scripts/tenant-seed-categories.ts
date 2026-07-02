import * as dotenv from 'dotenv';
import { runForRequestedTenants, seedTenantCategories } from './tenant-data-seed-utils';

dotenv.config();

runForRequestedTenants(async (prisma, seed) => {
  await seedTenantCategories(prisma, seed);
}).catch((error) => {
  console.error('Failed to seed tenant categories:', error);
  process.exit(1);
});
