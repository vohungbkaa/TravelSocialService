import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: 'Chính trị',
    description: 'Tin tức hoạt động chính trị, hiến pháp, pháp luật',
    sortOrder: 1,
  },
  {
    name: 'Văn hoá',
    description: 'Thông tin văn hóa, nghệ thuật, lễ hội truyền thống',
    sortOrder: 2,
  },
  {
    name: 'Y tế',
    description: 'Tin tức sức khỏe, y tế cộng đồng, phòng chống dịch',
    sortOrder: 3,
  },
  {
    name: 'Nông nghiệp',
    description: 'Thông tin sản xuất nông nghiệp, OCOP, khuyến nông',
    sortOrder: 4,
  },
  {
    name: 'Đoàn thanh niên',
    description: 'Hoạt động thanh niên, phong trào thanh thiếu nhi',
    sortOrder: 5,
  },
];

const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORIES.map(
  (category) => category.name,
);

const LEGACY_POST_CATEGORY_MAPPINGS = [
  { from: null, to: 'Chính trị' },
  { from: 'Tin tức', to: 'Chính trị' },
  { from: 'Tin thông báo', to: 'Chính trị' },
  { from: 'Thông báo', to: 'Chính trị' },
  { from: 'Nông sản OCOP', to: 'Nông nghiệp' },
  { from: 'Sản vật', to: 'Nông nghiệp' },
  { from: 'Du lịch & Điểm đến', to: 'Văn hoá' },
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
            imageUrl: null,
            active: true,
          },
        });
        createdCount++;
        console.log(`  + Đã tạo danh mục: ${cat.name}`);
      } else {
        await prisma.newsCategory.update({
          where: { id: existing.id },
          data: {
            description: cat.description,
            sortOrder: cat.sortOrder,
            imageUrl: null,
            active: true,
          },
        });
        console.log(`  ~ Đã cập nhật danh mục: ${cat.name}`);
      }
    }

    const { count: deactivatedCount } = await prisma.newsCategory.updateMany({
      where: {
        tenantId: tenant.id,
        name: { notIn: DEFAULT_CATEGORY_NAMES },
        active: true,
      },
      data: { active: false },
    });

    let updatedPostCount = 0;
    for (const mapping of LEGACY_POST_CATEGORY_MAPPINGS) {
      const { count } = await prisma.post.updateMany({
        where: {
          tenantId: tenant.id,
          category: mapping.from,
        },
        data: {
          category: mapping.to,
        },
      });
      updatedPostCount += count;
    }

    console.log(
      `✅ Hoàn thành tenant ${tenant.name}: Đã tạo mới ${createdCount} danh mục, ẩn ${deactivatedCount} danh mục cũ, cập nhật ${updatedPostCount} bài viết.`,
    );
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
