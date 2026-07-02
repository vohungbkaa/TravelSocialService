import { PrismaClient, TenantUserRole } from '@prisma/client';
import * as dotenv from 'dotenv';
import { getEnv, getOptionalEnv, LOCAL_TENANTS, upsertTenantAdmin, upsertTenantBundle } from './tenant-script-utils';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  const code = getEnv('TENANT_CODE').toLowerCase();
  const baseSeed = LOCAL_TENANTS.find((tenant) => tenant.code === code);

  if (!baseSeed) {
    throw new Error(`No built-in bootstrap seed for tenant code: ${code}`);
  }

  try {
    const { tenant, area } = await upsertTenantBundle(prisma, {
      ...baseSeed,
      domain: getOptionalEnv('TENANT_DOMAIN') || baseSeed.domain,
    });
    console.log(`Tenant bootstrapped: ${tenant.code} (${tenant.domain}), area=${area.slug}`);

    const adminUsername = getOptionalEnv('ADMIN_USERNAME');
    const adminEmail = getOptionalEnv('ADMIN_EMAIL');
    const adminPassword = getOptionalEnv('ADMIN_PASSWORD');

    if (adminUsername && adminEmail && adminPassword) {
      const { user, membership } = await upsertTenantAdmin(prisma, {
        tenantCode: tenant.code,
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        displayName: getOptionalEnv('ADMIN_DISPLAY_NAME') || adminUsername,
        tenantRole: (process.env.TENANT_USER_ROLE || 'OWNER') as TenantUserRole,
      });
      console.log(`Tenant admin bootstrapped: ${user.username} (${membership.role})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to bootstrap tenant:', error);
  process.exit(1);
});
