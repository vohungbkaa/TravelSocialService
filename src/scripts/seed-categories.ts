import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const categories = [
    { code: 'uncategorized', name: 'Chưa phân loại', description: 'Danh mục mặc định khi không chọn phân loại' },
    { code: 'ARCHITECTURE', name: 'Kiến trúc', description: 'Công trình, nhà cổ, cầu, phố cổ, kiến trúc đặc trưng' },
    { code: 'CUISINE', name: 'Ẩm thực', description: 'Món ngon, đặc sản, quán ăn, trải nghiệm ăn uống' },
    { code: 'CULTURE', name: 'Văn hóa', description: 'Phong tục, đời sống địa phương, làng nghề, sinh hoạt truyền thống' },
    { code: 'HISTORY', name: 'Lịch sử', description: 'Di tích, bảo tàng, địa danh gắn với sự kiện lịch sử' },
    { code: 'FESTIVAL', name: 'Lễ hội', description: 'Lễ hội dân gian, sự kiện văn hóa, hoạt động cộng đồng' },
  ];

  try {
    console.log('Seeding place categories...');
    for (const cat of categories) {
      await prisma.placeCategory.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
        },
      });
    }
    console.log('Seeding categories completed successfully.');
  } catch (error) {
    console.error('Failed to seed categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

