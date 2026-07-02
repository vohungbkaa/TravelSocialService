import { PrismaClient } from '@prisma/client';
import { LOCAL_TENANTS, upsertTenantBundle } from './tenant-script-utils';

async function main() {
  const prisma = new PrismaClient();

  const areaData = {
    slug: 'tien-thang',
    name: 'Xã Tiến Thắng',
    provinceCode: 'hanoi',
    centerLat: 21.195,
    centerLng: 105.6775,
    defaultRadiusKm: 3.0,
    published: true,
    description: 'Tiến Thắng là vùng đất có bề dày lịch sử, lưu giữ nhiều nét văn hóa làng quê truyền thống của vùng đồng bằng Bắc Bộ với hệ thống đình, chùa, miếu cổ kính. Đời sống tinh thần của người dân gắn liền với các lễ hội làng truyền thống được tổ chức hàng năm.'
  };

  try {
    console.log('Seeding map areas...');
    const tenantSeed = LOCAL_TENANTS.find((tenant) => tenant.code === 'tien-thang');
    if (!tenantSeed) {
      throw new Error('Missing tien-thang tenant seed');
    }

    await upsertTenantBundle(prisma, {
      ...tenantSeed,
      area: {
        ...tenantSeed.area,
        ...areaData,
      },
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
