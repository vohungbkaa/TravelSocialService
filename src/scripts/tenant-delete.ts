import { PrismaClient } from '@prisma/client';

async function main() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const code = arg?.trim().toLowerCase();

  if (!code) {
    console.error('Please specify a tenant code to delete. Example: npm run tenant:delete -- tien-thang');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    console.log(`Searching for tenant with code: ${code}...`);
    const tenant = await prisma.tenant.findUnique({
      where: { code },
    });

    if (!tenant) {
      console.log(`Tenant with code "${code}" does not exist in the database.`);
      return;
    }

    console.log(`Deleting tenant: ${tenant.name} (${tenant.code})...`);
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
    console.log(`Tenant "${code}" and all associated data have been successfully deleted (via cascade).`);
  } catch (error) {
    console.error('Failed to delete tenant:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
