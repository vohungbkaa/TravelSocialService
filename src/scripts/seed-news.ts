import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding news posts...');

  const tenant = await prisma.tenant.findUnique({
    where: { code: 'tien-thang' },
  });
  if (!tenant) {
    console.log('Tenant tien-thang not found');
    return;
  }

  // Clear old dummy posts for this tenant to avoid duplicates
  await prisma.post.deleteMany({
    where: { tenantId: tenant.id },
  });

  // Tìm Admin của Tenant 'tien-thang'
  let tenantUser = await prisma.tenantUser.findFirst({
    where: {
      tenantId: tenant.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    include: { user: true },
  });

  // Nếu chưa có admin cho tenant này, tự động tạo 1 user mới
  if (!tenantUser) {
    console.log('No admin found for tien-thang, creating one...');
    const newUser = await prisma.user.create({
      data: {
        username: 'admin_tienthang',
        email: 'admin@tienthang.gov.vn',
        status: 'ACTIVE',
        profile: {
          create: {
            fullName: 'UBND Xã Tiến Thắng',
            avatarMediaId:
              'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
          },
        },
        tenants: {
          create: {
            tenantId: tenant.id,
            role: 'ADMIN',
          },
        },
      },
    });

    tenantUser = { user: newUser } as any;
  }

  const user = tenantUser!.user;

  // Insert Mock Posts
  await prisma.post.create({
    data: {
      tenantId: tenant.id,
      authorId: user.id,
      content:
        '🌾 Lễ hội mừng mùa lúa mới 2026 chính thức diễn ra tại Sân đình làng Tiến Thắng. Kính mời toàn thể bà con và du khách tới tham dự các trò chơi dân gian và thưởng thức đặc sản lúa nếp!',
      category: 'Tin thông báo',
      likesCount: 128,
      commentsCount: 34,
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
          },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      tenantId: tenant.id,
      authorId: user.id,
      content:
        '🍯 Mùa thu hoạch mật ong hoa nhãn đợt 1 năm nay đã hoàn tất. Mật ong nguyên chất, thơm lừng béo ngậy! Bà con có thể đặt mua trực tiếp tại gian hàng OCOP trên ứng dụng.',
      category: 'Nông sản OCOP',
      likesCount: 95,
      commentsCount: 18,
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800',
          },
        ],
      },
    },
  });

  await prisma.post.create({
    data: {
      tenantId: tenant.id,
      authorId: user.id,
      content:
        '📸 Điểm check-in Hồ sen Đầm Sậy đang vào mùa nở rộ đẹp nhất trong năm. Rất thích hợp cho các buổi chụp ảnh áo dài và dã ngoại cuối tuần cùng gia đình.',
      category: 'Du lịch & Điểm đến',
      likesCount: 210,
      commentsCount: 45,
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
          },
        ],
      },
    },
  });

  console.log('Seeded successfully using tenant admin:', user.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
