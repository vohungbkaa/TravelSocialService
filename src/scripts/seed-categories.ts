import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const categories = [
    { code: 'uncategorized', name: 'Chưa phân loại', description: 'Danh mục mặc định khi không chọn phân loại', icon: 'map-pin' },
    { code: 'ARCHITECTURE', name: 'Kiến trúc', description: 'Công trình, nhà cổ, cầu, phố cổ, kiến trúc đặc trưng', icon: 'landmark' },
    { code: 'CUISINE', name: 'Ẩm thực', description: 'Món ngon, đặc sản, quán ăn, trải nghiệm ăn uống', icon: 'utensils' },
    { code: 'CULTURE', name: 'Văn hóa', description: 'Phong tục, đời sống địa phương, làng nghề, sinh hoạt truyền thống', icon: 'masks-theater' },
    { code: 'HISTORY', name: 'Lịch sử', description: 'Di tích, bảo tàng, địa danh gắn với sự kiện lịch sử', icon: 'monument' },
    { code: 'FESTIVAL', name: 'Lễ hội', description: 'Lễ hội dân gian, sự kiện văn hóa, hoạt động cộng đồng', icon: 'calendar-days' },
    { code: 'ACTIVITY', name: 'Vui chơi / Giải trí', description: 'Khu vui chơi, cắm trại, dã ngoại ngoài trời', icon: 'campground' },
    { code: 'ACCOMMODATION', name: 'Cơ sở lưu trú', description: 'Khách sạn, homestay, nhà nghỉ', icon: 'hotel' },
    { code: 'SHOPPING', name: 'Mua sắm', description: 'Chợ truyền thống, cửa hàng quà lưu niệm, đặc sản', icon: 'store' },
    { code: 'VIEWPOINT', name: 'Điểm check-in / Phong cảnh', description: 'Địa điểm chụp ảnh đẹp, ngắm cảnh thiên nhiên', icon: 'camera' },
  ];

  try {
    console.log('Seeding place categories with icons...');
    for (const cat of categories) {
      await prisma.placeCategory.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
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

