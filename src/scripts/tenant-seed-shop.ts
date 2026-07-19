import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { getRequestedTenantCodes } from './tenant-data-seed-utils';

dotenv.config();

const prisma = new PrismaClient();
const FLUTTER_APP_DIR = path.resolve(
  process.cwd(),
  '..',
  'TravelSocialFlutterApp',
);
const SHOP_IMAGE_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');

const SHOP_CATEGORIES = [
  {
    name: 'Đặc sản',
    description: 'Đặc sản, sản vật truyền thống địa phương',
    sortOrder: 1,
  },
  { name: 'Trái cây', description: 'Trái cây và nông sản tươi', sortOrder: 2 },
];

const ACTIVE_SHOP_CATEGORY_NAMES = SHOP_CATEGORIES.map(
  (category) => category.name,
);

const SHOP_PRODUCTS = [
  {
    name: 'Nem chua Phương Xứng',
    price: 'Giá liên hệ',
    origin: 'Hộ kinh doanh Phương Xứng - Tiến Thắng',
    rating: '5.0',
    imageAsset: 'nemchua.jpeg',
    category: 'Đặc sản',
    sortOrder: 1,
    description:
      '🍃 NEM CHUA PHƯƠNG XỨNG – VỊ CHUA CAY HÀI HÒA, ĐẬM ĐÀ TÌNH QUÊ\nGóp mặt vào danh sách những đặc sản mộc mạc tại Tiến Thắng, Hộ kinh doanh Phương Xứng tự hào mang đến món Nem chua truyền thống – một thức quà mang phong vị riêng biệt, thanh tao và sạch sẽ.\n\n✨ Bí Quyết Thủ Công Cho Vị Ngon Tròn Khía\nQuy trình chế biến nem chua tại Phương Xứng cực kỳ tỉ mỉ và khắt khe:\n* Thịt nạc mông tuyển chọn: Thịt lợn vừa mới ra lò, lọc kỹ màng gân rồi đem xay dẻo.\n* Bì lợn làm sạch thủ công: Được luộc chín tới, cán mỏng và sợi thật nhỏ, đều tăm tắp để giữ độ giòn.\n* Gia vị hòa quyện: Trộn đều cùng thính gạo rang thơm, nước mắm ngon, tỏi tươi, ớt hiểm và tiêu sọ nguyên hạt.\n* Lên men tự nhiên: Nem được gói chặt tay cùng lá đinh lăng, bên ngoài bọc nhiều lớp lá chuối xanh, lên men hoàn toàn tự nhiên bằng nhiệt độ thời tiết.\n\n🤤 Hương Vị Kích Thích Mọi Giác Quan\nBóc từng lớp lá, chiếc nem hiện ra với sắc hồng tự nhiên của thịt. Khi thưởng thức, bạn sẽ cảm nhận được vị chua thanh nhẹ nhàng, độ giòn sần sật của bì quyện với vị cay ấm của ớt, thơm nồng của tỏi và cái hậu ngọt dịu dàng của thịt sạch.\n* Địa chỉ mua hàng: Hộ kinh doanh Phương Xứng – Thanh Vân, Tiến Thắng, Hà Nội.\n* Cam kết: Lên men tự nhiên – 100% không chất bảo quản – An toàn thực phẩm.',
  },
  {
    name: 'Giò lợn Thanh Vân',
    price: 'Giá liên hệ',
    origin: 'Thôn Thanh Vân, xã Tiến Thắng',
    rating: '5.0',
    imageAsset: 'gio.jpeg',
    category: 'Đặc sản',
    sortOrder: 2,
    description:
      '🐷 GIÒ LỢN THANH VÂN (TIẾN THẮNG) – ĐẬM ĐÀ VỊ QUÊ, TRỌN VẸN BỮA CƠM NHÀ\nBên cạnh những hạt cốm xanh mộc mạc thơm hương lúa mới, thôn Thanh Vân (xã Tiến Thắng, huyện Mê Linh, Hà Nội) còn nổi tiếng với một thức quà ẩm thực bình dị nhưng vô cùng tinh tế, luôn góp mặt trong mọi mâm cỗ ngày lễ Tết và bữa cơm gia đình: Giò lợn truyền thống Thanh Vân.\nKhông cầu kỳ phô trương, giò lợn Thanh Vân chinh phục thực khách bằng chính sự mộc mạc, nguyên bản và cái tâm của người làm nghề.\n\n✨ Bí Quyết Từ Sự Khắt Khe Trong Chọn Lựa Nguyên Liệu\nĐể làm ra những khoanh giò ngon, giòn dai tự nhiên mà không cần đến bất kỳ loại phụ gia hay chất hàn thòng nào, người thợ làm giò tại Thanh Vân phải tuân thủ những nguyên tắc nghề nghiệp nghiêm ngặt:\n* Thịt lợn "hút" tươi ngon: Thịt được chọn phải là thịt nạc mông của lợn mới mổ buổi sớm, miếng thịt còn ấm nóng, có độ đàn hồi cao và dính tay. Đây là yếu tố quyết định giúp giò có độ dẻo mịn và kết dính tự nhiên.\n* Nước mắm cốt truyền thống: Gia vị hòa quyện cùng thịt không thể thiếu nước mắm loại ngon, thơm đậm đà nhưng không quá chát, giúp tôn lên vị ngọt tự nhiên của thịt lợn.\n* Gói bằng lá chuối xanh: Giò Thanh Vân được gói hoàn toàn bằng lá chuối tươi lót bên trong. Khi luộc chín, hương thơm đặc trưng của lá chuối quyện vào miếng giò, tạo nên mùi vị thân thuộc của quê hương mà màng bọc nilon không bao giờ có được.\n\n🍽️ Hương Vị Đạt Chuẩn – Ngon Từ Miếng Đầu Tiên\nMỗi khoanh giò lợn Thanh Vân khi cắt ra đều mang đầy đủ những đặc điểm của một mẻ giò hảo hạng:\n* Màu sắc tự nhiên: Mặt giò có màu trắng ngà, hơi ngả sang hồng nhạt, thớ giò mịn màng.\n* Bề mặt "biết nói": Khoanh giò xuất hiện nhiều "lỗ rỗ" nhỏ – minh chứng cho thấy thịt được giã/xay khi còn rất tươi và chứa khí tự nhiên, giò không bị pha bột hay chất độn.\n* Vị ngon khó cưỡng: Khi ăn, bạn sẽ cảm nhận được độ giòn dai sần sật nhẹ nhàng, vị ngọt đậm đà của thịt nạc quyện với vị béo ngậy vừa vặn của chút mỡ phần được pha theo tỷ lệ vàng.\n\n📍 Thức Quà Sạch Cho Mọi Nhà\nGiờ đây, giò lợn Thanh Vân không chỉ gói gọn trong gian bếp của người dân Tiến Thắng, mà đã theo chân các bà, các mẹ đi khắp các chợ truyền thống và mâm cơm của người dân Thủ đô.\n* Xuất xứ: Thôn Thanh Vân, xã Tiến Thắng, huyện Mê Linh, Hà Nội.\n* Ứng dụng: Thích hợp ăn kèm cơm nóng, xôi nếp, bánh mì buổi sáng, hoặc làm quà biếu tặng ý nghĩa trong các dịp lễ, giỗ chạp.\n* Cam kết: 100% thịt sạch – Không hàn thia – Không chất bảo quản.',
  },
  {
    name: 'Mô hình dưa lưới',
    price: 'Giá liên hệ',
    origin: 'Xã Tiến Thắng, Mê Linh',
    rating: '5.0',
    imageAsset: 'dualuoi.jpeg',
    category: 'Trái cây',
    sortOrder: 3,
    description:
      'Melon DƯA LƯỚI TIẾN THẮNG – NGỌT MÁT TRỌN VỊ, AN TÂM ĐẾN TỪ CÔNG NGHỆ SẠCH\nNhững năm gần đây, vùng đất Tiến Thắng (Mê Linh, Hà Nội) không chỉ nổi tiếng với những ruộng hoa, ruộng cốm truyền thống mà còn tự hào mang đến cho người tiêu dùng một thức quả cao cấp, thanh mát: Dưa lưới công nghệ cao Tiến Thắng.\nBằng việc ứng dụng quy trình hiện đại, những quả dưa lưới nơi đây đang dần khẳng định vị thế, trở thành một đặc sản nông sản sạch tiêu biểu của thủ đô.\n\n🌟 Tinh Hoa Từ Nhà Màng Công Nghệ Cao\nĐể cho ra đời những trái dưa lưới đạt chuẩn "vàng", người nông dân Tiến Thắng đã mạnh dạn đầu tư vào mô hình nhà màng (nhà kính) hiện đại cùng hệ thống tưới nhỏ giọt Israel:\n* Sạch tuyệt đối: Môi trường nhà màng cách ly hoàn toàn với côn trùng và dịch bệnh, giúp hạn chế tối đa việc sử dụng thuốc bảo vệ thực vật. Trái dưa phát triển hoàn toàn tự nhiên và an toàn cho sức khỏe.\n* Chăm sóc "đo ni đóng giày": Mỗi cây dưa được nuôi dưỡng trong từng giá thể riêng biệt, nhận vừa đủ hàm lượng dinh dưỡng và nước qua hệ thống tưới tự động, giúp quả phát triển đồng đều, chất lượng ổn định.\n* Mỗi cây một quả: Để tập trung toàn bộ chất dinh dưỡng nuôi trái, người làm vườn chỉ giữ lại duy nhất một quả đẹp nhất trên mỗi cây. Đó là lý do dưa lưới Tiến Thắng luôn có kích thước chuẩn, vân lưới đều và đẹp mắt.\n\n🤤 Hương Vị Đánh Thức Cả Thính Giác Lẫn Vị Giác\nCầm trên tay trái dưa lưới Tiến Thắng, bạn sẽ ngay lập tức bị chinh phục bởi những đặc điểm vượt trội:\n* Vẻ ngoài sang trọng: Vỏ dưa dày, các đường vân lưới nổi rõ, đan xen đều đặn như một tác phẩm nghệ thuật, rất thích hợp để làm quà biếu tặng.\n* Cùi dày, mọng nước: Khi bổ ra, phần thịt dưa có màu sắc bắt mắt (xanh ngọc hoặc cam tùy giống), đặc ruột, hạt nhỏ.\n* Vị ngọt thanh, giòn rụm: Thưởng thức một miếng dưa ướp lạnh, bạn sẽ cảm nhận được vị ngọt sâu lắng, giòn tan kèm theo hương thơm dịu nhẹ, thanh mát đặc trưng lan tỏa.\n\n📍 Nông Sản Sạch Tiến Thắng – Từ Nông Trại Đến Bàn Ăn\nGiờ đây, người tiêu dùng Hà Nội không cần phải tìm kiếm đâu xa để thưởng thức dưa lưới chuẩn VietGAP/OCOP chất lượng cao.\n* Xuất xứ: Các hợp tác xã/trang trại nông nghiệp công nghệ cao tại xã Tiến Thắng, huyện Mê Linh, Hà Nội.\n* Cam kết chất lượng: Giòn - Ngọt - Sạch - Thu hoạch chính vụ, không chất chín ép.',
  },
  {
    name: 'Cốm Thanh Vân',
    price: 'Giá liên hệ',
    origin: 'Thôn Thanh Vân, xã Tiến Thắng',
    rating: '5.0',
    imageAsset: 'com.jpeg',
    category: 'Đặc sản',
    sortOrder: 4,
    description:
      '🌾 CỐM THANH VÂN – HƯƠNG VỊ MÙA THU, TINH HOA ĐẤT TRỜI HÀ NỘI\nNếu như nhắc đến mùa thu Hà Nội, người ta thường nghĩ ngay đến sắc vàng của lá rơi, cái se se lạnh của gió heo may và hương thơm dịu dàng của cốm mộc. Bên cạnh những cái tên đã quen thuộc, có một vùng đất vẫn đang âm thầm gìn giữ và chắt chiu từng hạt ngọc xanh của đồng quê – đó chính là Cốm Thanh Vân (Tiến Thắng, Hà Nội).\n\n✨ Từ Hạt Lúa Non Đến Thức Quà Tinh Tế\nCốm Thanh Vân không chỉ là một món ăn, đó là cả một nghệ thuật được kết tinh từ sự cần mẫn và lòng yêu nghề của người dân nơi đây.\n* Chọn lúa kỹ lưỡng: Để có được mẻ cốm đạt chuẩn, người thợ phải ra đồng từ sớm, chọn những bông lúa nếp non (thường là nếp cái hoa vàng) đang lúc bấm ra sữa.\n* Chế biến kỳ công: Quá trình làm cốm đòi hỏi sự tỉ mỉ trong từng công đoạn: từ rang lúa sao cho vừa chín tới (không quá lửa để cốm không bị cứng, không non quá để cốm không bị nát), đến việc giã cốm, sàng sảy để cho ra những hạt cốm dẻo mang sắc xanh tự nhiên, mộc mạc.\n\n🍃 Hương Vị Đậm Đà Bản Sắc Quê Hương\nThưởng thức cốm Thanh Vân là thưởng thức cái tinh túy của đất trời. Nhón một chút cốm nhẹ nhàng cho vào miệng, bạn sẽ cảm nhận được:\n* Vị dẻo bùi, ngọt thanh tự nhiên của sữa lúa non.\n* Hương thơm thoang thoảng mộc mạc hòa quyện cùng mùi lá sen bọc ngoài.\nCốm Thanh Vân ăn mộc cùng chuối tiêu chín cuốc là "chuẩn vị" nhất. Bên cạnh đó, cốm còn là nguyên liệu tuyệt vời để làm nên các món ngon đậm chất Hà Thành như: chả cốm béo ngậy, xôi cốm hạt sen dẻo thơm, hay chè cốm ngọt mát.\n\n📍 Địa Chỉ Tìm Mua Cốm Thanh Vân Chính Gốc\nNếu bạn muốn tìm lại hương vị cốm mộc mạc, dẻo thơm đúng nghĩa hoặc chọn một thức quà ý nghĩa tặng người thân, hãy ghé qua:\n* Địa chỉ: Thôn Thanh Vân, xã Tiến Thắng, huyện Mê Linh, Hà Nội.\n* Đặc điểm sản phẩm: Cốm mới mỗi ngày, không chất bảo quản, giữ nguyên màu xanh tự nhiên của lúa non.',
  },
];

async function seedShopForTenant(tenantCode: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { code: tenantCode },
  });
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantCode}`);
  }

  const categoriesByName = new Map<string, { id: string; name: string }>();
  for (const category of SHOP_CATEGORIES) {
    const saved = await prisma.shopCategory.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: category.name,
        },
      },
      update: {
        description: category.description,
        sortOrder: category.sortOrder,
        active: true,
      },
      create: {
        tenantId: tenant.id,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });
    categoriesByName.set(saved.name, saved);
  }

  await prisma.shopCategory.updateMany({
    where: {
      tenantId: tenant.id,
      name: { notIn: ACTIVE_SHOP_CATEGORY_NAMES },
      active: true,
    },
    data: { active: false },
  });

  for (const product of SHOP_PRODUCTS) {
    const imageUrl = await ensureShopImage(product.imageAsset);
    const category = categoriesByName.get(product.category);
    if (!category) {
      throw new Error(`Missing shop category: ${product.category}`);
    }

    const existing = await prisma.shopProduct.findFirst({
      where: {
        tenantId: tenant.id,
        name: product.name,
      },
    });

    const data = {
      tenantId: tenant.id,
      categoryId: category.id,
      name: product.name,
      price: product.price,
      origin: product.origin,
      rating: product.rating,
      description: product.description,
      imageUrl,
      isOcop: true,
      active: true,
      sortOrder: product.sortOrder,
    };

    if (existing) {
      await prisma.shopProductImage.deleteMany({
        where: { productId: existing.id },
      });
      await prisma.shopProduct.update({
        where: { id: existing.id },
        data: {
          ...data,
          images: {
            create: [{ imageUrl, sortOrder: 0 }],
          },
        },
      });
    } else {
      await prisma.shopProduct.create({
        data: {
          ...data,
          images: {
            create: [{ imageUrl, sortOrder: 0 }],
          },
        },
      });
    }

    console.log(`Shop product ready: ${tenant.code}/${product.name}`);
  }
}

async function ensureShopImage(imageAsset: string) {
  const sourcePath = path.join(FLUTTER_APP_DIR, 'assets', imageAsset);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Shop seed image not found: ${sourcePath}`);
  }

  await fs.promises.mkdir(SHOP_IMAGE_DIR, { recursive: true });
  const targetFileName = `shop-${imageAsset}`;
  const targetPath = path.join(SHOP_IMAGE_DIR, targetFileName);

  await fs.promises.copyFile(sourcePath, targetPath);

  return `/media/images/${targetFileName}`;
}

async function main() {
  for (const tenantCode of getRequestedTenantCodes()) {
    await seedShopForTenant(tenantCode);
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed shop data:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
