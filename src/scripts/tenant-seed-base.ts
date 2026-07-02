import * as dotenv from 'dotenv';
import { runForRequestedTenants, seedTenantBase } from './tenant-data-seed-utils';

dotenv.config();

runForRequestedTenants(async (prisma, seed) => {
  await seedTenantBase(prisma, seed);
}).catch((error) => {
  console.error('Failed to seed tenant base data:', error);
  process.exit(1);
});
