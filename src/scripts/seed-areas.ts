import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const areaData = {
    slug: 'tien-thang',
    name: 'Xã Tiến Thắng',
    provinceCode: 'hn',
    centerLat: 21.195,
    centerLng: 105.6775,
    defaultRadiusKm: 3.0,
    published: true,
    description: 'Tiến Thắng là vùng đất có bề dày lịch sử, lưu giữ nhiều nét văn hóa làng quê truyền thống của vùng đồng bằng Bắc Bộ với hệ thống đình, chùa, miếu cổ kính. Đời sống tinh thần của người dân gắn liền với các lễ hội làng truyền thống được tổ chức hàng năm.'
  };

  try {
    console.log('Seeding map areas...');
    await prisma.area.upsert({
      where: { slug: areaData.slug },
      update: {
        name: areaData.name,
        provinceCode: areaData.provinceCode,
        centerLat: areaData.centerLat,
        centerLng: areaData.centerLng,
        defaultRadiusKm: areaData.defaultRadiusKm,
        published: areaData.published,
        description: areaData.description
      },
      create: {
        slug: areaData.slug,
        name: areaData.name,
        provinceCode: areaData.provinceCode,
        centerLat: areaData.centerLat,
        centerLng: areaData.centerLng,
        defaultRadiusKm: areaData.defaultRadiusKm,
        published: areaData.published,
        description: areaData.description
      }
    });
    console.log('Seeding areas completed successfully.');
  } catch (error) {
    console.error('Failed to seed areas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
