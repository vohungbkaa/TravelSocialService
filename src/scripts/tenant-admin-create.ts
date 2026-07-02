import { PrismaClient, TenantUserRole } from '@prisma/client';
import * as dotenv from 'dotenv';
import { getEnv, upsertTenantAdmin } from './tenant-script-utils';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();

  try {
    const { tenant, user, membership } = await upsertTenantAdmin(prisma, {
      tenantCode: getEnv('TENANT_CODE').toLowerCase(),
      email: getEnv('ADMIN_EMAIL'),
      username: getEnv('ADMIN_USERNAME'),
      password: getEnv('ADMIN_PASSWORD'),
      displayName: getEnv('ADMIN_DISPLAY_NAME', getEnv('ADMIN_USERNAME')),
      tenantRole: (process.env.TENANT_USER_ROLE || 'OWNER') as TenantUserRole,
    });

    console.log(`Tenant admin ready: ${user.username} -> ${tenant.code} (${membership.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to create tenant admin:', error);
  process.exit(1);
});
