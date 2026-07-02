import { MarkerIcon, PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  const markerIconSeeds = [
    { key: 'map-pin', name: 'Mặc định', iconUrl: 'https://api.iconify.design/lucide:map-pin.svg?color=%23ffffff', markerColor: '#6366f1' },
    { key: 'landmark', name: 'Di tích / Công trình', iconUrl: 'https://api.iconify.design/lucide:landmark.svg?color=%23ffffff', markerColor: '#3b82f6' },
    { key: 'utensils', name: 'Ẩm thực', iconUrl: 'https://api.iconify.design/lucide:utensils.svg?color=%23ffffff', markerColor: '#f59e0b' },
    { key: 'masks-theater', name: 'Văn hóa', iconUrl: 'https://api.iconify.design/lucide:drama.svg?color=%23ffffff', markerColor: '#a855f7' },
    { key: 'monument', name: 'Lịch sử', iconUrl: 'https://api.iconify.design/lucide:book-open.svg?color=%23ffffff', markerColor: '#10b981' },
    { key: 'calendar-days', name: 'Lễ hội / Sự kiện', iconUrl: 'https://api.iconify.design/lucide:calendar-days.svg?color=%23ffffff', markerColor: '#ec4899' },
    { key: 'campground', name: 'Vui chơi / Dã ngoại', iconUrl: 'https://api.iconify.design/lucide:tent.svg?color=%23ffffff', markerColor: '#06b6d4' },
    { key: 'hotel', name: 'Lưu trú', iconUrl: 'https://api.iconify.design/lucide:hotel.svg?color=%23ffffff', markerColor: '#6366f1' },
    { key: 'store', name: 'Mua sắm', iconUrl: 'https://api.iconify.design/lucide:store.svg?color=%23ffffff', markerColor: '#0f766e' },
    { key: 'camera', name: 'Check-in / Phong cảnh', iconUrl: 'https://api.iconify.design/lucide:camera.svg?color=%23ffffff', markerColor: '#ef4444' },
  ];

  const categories = [
    { code: 'uncategorized', name: 'Chưa phân loại', description: 'Danh mục mặc định khi không chọn phân loại', markerIconKey: 'map-pin' },
    { code: 'ARCHITECTURE', name: 'Kiến trúc', description: 'Công trình, nhà cổ, cầu, phố cổ, kiến trúc đặc trưng', markerIconKey: 'landmark' },
    { code: 'CUISINE', name: 'Ẩm thực', description: 'Món ngon, đặc sản, quán ăn, trải nghiệm ăn uống', markerIconKey: 'utensils' },
    { code: 'CULTURE', name: 'Văn hóa', description: 'Phong tục, đời sống địa phương, làng nghề, sinh hoạt truyền thống', markerIconKey: 'masks-theater' },
    { code: 'HISTORY', name: 'Lịch sử', description: 'Di tích, bảo tàng, địa danh gắn với sự kiện lịch sử', markerIconKey: 'monument' },
    { code: 'FESTIVAL', name: 'Lễ hội', description: 'Lễ hội dân gian, sự kiện văn hóa, hoạt động cộng đồng', markerIconKey: 'calendar-days' },
    { code: 'ACTIVITY', name: 'Vui chơi / Giải trí', description: 'Khu vui chơi, cắm trại, dã ngoại ngoài trời', markerIconKey: 'campground' },
    { code: 'ACCOMMODATION', name: 'Cơ sở lưu trú', description: 'Khách sạn, homestay, nhà nghỉ', markerIconKey: 'hotel' },
    { code: 'SHOPPING', name: 'Mua sắm', description: 'Chợ truyền thống, cửa hàng quà lưu niệm, đặc sản', markerIconKey: 'store' },
    { code: 'VIEWPOINT', name: 'Điểm check-in / Phong cảnh', description: 'Địa điểm chụp ảnh đẹp, ngắm cảnh thiên nhiên', markerIconKey: 'camera' },
  ];

  try {
    console.log('Seeding marker icons...');
    const markerIconByKey = new Map<string, MarkerIcon>();
    for (const icon of markerIconSeeds) {
      const markerIcon = await prisma.markerIcon.upsert({
        where: { key: icon.key },
        update: {
          name: icon.name,
          iconUrl: icon.iconUrl,
          markerColor: icon.markerColor,
          active: true,
        },
        create: {
          key: icon.key,
          name: icon.name,
          iconUrl: icon.iconUrl,
          markerColor: icon.markerColor,
          active: true,
        },
      });
      markerIconByKey.set(icon.key, markerIcon);
    }

    console.log('Seeding place categories with marker icon references...');
    for (const cat of categories) {
      const markerIcon = markerIconByKey.get(cat.markerIconKey);
      if (!markerIcon) {
        throw new Error(`Missing marker icon seed: ${cat.markerIconKey}`);
      }

      await prisma.placeCategory.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
          icon: markerIcon.key,
          iconUrl: markerIcon.iconUrl,
          markerColor: markerIcon.markerColor,
          markerIconId: markerIcon.id,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          icon: markerIcon.key,
          iconUrl: markerIcon.iconUrl,
          markerColor: markerIcon.markerColor,
          markerIconId: markerIcon.id,
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
