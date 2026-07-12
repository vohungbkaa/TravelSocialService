import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Tin tức', description: 'Tin tức hoạt động của xã', sortOrder: 1 },
  { name: 'Thông báo', description: 'Thông báo nội bộ, văn bản hành chính', sortOrder: 2 },
  { name: 'Du lịch & Điểm đến', description: 'Giới thiệu các điểm đến và du lịch', sortOrder: 3 },
  { name: 'Sản vật', description: 'Giới thiệu sản vật địa phương', sortOrder: 4 },
];

async function main() {
  console.log('🌱 Bắt đầu tạo danh mục tin tức mặc định...');

  const tenants = await prisma.tenant.findMany();
  
  if (tenants.length === 0) {
    console.log('⚠️ Không tìm thấy tenant nào trong hệ thống.');
    return;
  }

  for (const tenant of tenants) {
    console.log(`\nĐang xử lý tenant: ${tenant.name} (${tenant.code})`);
    
    let createdCount = 0;
    
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await prisma.newsCategory.findUnique({
        where: {
          tenantId_name: {
            tenantId: tenant.id,
            name: cat.name,
          },
        },
      });

      if (!existing) {
        await prisma.newsCategory.create({
          data: {
            tenantId: tenant.id,
            name: cat.name,
            description: cat.description,
            sortOrder: cat.sortOrder,
          },
        });
        createdCount++;
        console.log(`  + Đã tạo danh mục: ${cat.name}`);
      } else {
        console.log(`  - Đã tồn tại danh mục: ${cat.name}`);
      }
    }
    
    console.log(`✅ Hoàn thành tenant ${tenant.name}: Đã tạo mới ${createdCount} danh mục.`);
  }

  console.log('\n🎉 Đã hoàn thành quá trình tạo danh mục tin tức mặc định!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
