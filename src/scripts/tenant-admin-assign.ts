import { PrismaClient, TenantUserRole } from '@prisma/client';
import * as dotenv from 'dotenv';
import { getEnv, getOptionalEnv, upsertTenantAdmin } from './tenant-script-utils';

dotenv.config();

async function main() {
  const prisma = new PrismaClient();
  const username = getOptionalEnv('ADMIN_USERNAME');
  const email = getOptionalEnv('ADMIN_EMAIL');

  if (!username && !email) {
    throw new Error('ADMIN_USERNAME or ADMIN_EMAIL is required');
  }

  const filters = [];
  if (username) {
    filters.push({ username: username.toLowerCase() });
  }
  if (email) {
    filters.push({ email: email.toLowerCase() });
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: filters,
    },
    include: { profile: true },
  });
  if (!existing) {
    throw new Error('User not found. Use tenant:admin:create to create a new admin.');
  }

  try {
    const { tenant, user, membership } = await upsertTenantAdmin(prisma, {
      tenantCode: getEnv('TENANT_CODE').toLowerCase(),
      email: existing.email || email || `${existing.username}@example.local`,
      username: existing.username,
      displayName: getOptionalEnv('ADMIN_DISPLAY_NAME') || existing.profile?.displayName || existing.username,
      tenantRole: (process.env.TENANT_USER_ROLE || 'ADMIN') as TenantUserRole,
    });

    console.log(`Tenant admin assigned: ${user.username} -> ${tenant.code} (${membership.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to assign tenant admin:', error);
  process.exit(1);
});
