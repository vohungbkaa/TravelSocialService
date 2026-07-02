import * as dotenv from 'dotenv';
import { runForRequestedTenants, seedTenantAdmins } from './tenant-data-seed-utils';

dotenv.config();

runForRequestedTenants(async (prisma, seed) => {
  await seedTenantAdmins(prisma, seed);
}).catch((error) => {
  console.error('Failed to seed tenant admins:', error);
  process.exit(1);
});
