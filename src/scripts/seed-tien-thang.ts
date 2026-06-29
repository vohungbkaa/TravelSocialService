import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const area = {
    name: 'Xã Tiến Thắng',
    slug: 'tien-thang',
    provinceCode: 'hn',
    description: 'Tiến Thắng là vùng đất có bề dày lịch sử, lưu giữ nhiều nét văn hóa làng quê truyền thống của vùng đồng bằng Bắc Bộ với hệ thống đình, chùa, miếu cổ kính. Đời sống tinh thần của người dân gắn liền với các lễ hội làng truyền thống được tổ chức hàng năm.',
    centerLat: 21.195,
    centerLng: 105.6775,
    published: true,
  };

  try {
    console.log('Seeding Tien Thang area...');
    await prisma.area.upsert({
      where: { slug: area.slug },
      update: {
        name: area.name,
        provinceCode: area.provinceCode,
        description: area.description,
        centerLat: area.centerLat,
        centerLng: area.centerLng,
        published: area.published,
      },
      create: {
        name: area.name,
        slug: area.slug,
        provinceCode: area.provinceCode,
        description: area.description,
        centerLat: area.centerLat,
        centerLng: area.centerLng,
        published: area.published,
      },
    });
    console.log('Seeding Tien Thang area completed successfully.');
  } catch (error) {
    console.error('Failed to seed Tien Thang area:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
