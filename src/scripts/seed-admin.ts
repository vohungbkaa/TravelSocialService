import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const displayName = process.env.SEED_ADMIN_DISPLAY_NAME || 'Administrator';

  if (!email || !username || !password) {
    console.error(
      'Missing required environment variables for seeding admin user.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log(`Checking for existing admin user: ${email} / ${username}`);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      console.log(`User already exists. Updating role to SUPER_ADMIN.`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
      console.log('Seed completed: Admin user updated.');
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            passwordHash,
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
          },
        });

        await tx.userProfile.create({
          data: {
            userId: user.id,
            fullName: displayName,
          },
        });
      });
      console.log('Seed completed: Admin user created.');
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
