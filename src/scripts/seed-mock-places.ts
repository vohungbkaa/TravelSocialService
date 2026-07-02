import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UploadService } from '../upload/upload.service';
import { PlacesService } from '../places/places.service';
import { PrismaService } from '../database/prisma.service';
import { PlaceStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

function createMulterFile(filePath: string, mimetype: string): Express.Multer.File {
  const originalname = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);
  const size = buffer.length;
  
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size,
    stream: null as any,
    destination: '',
    filename: originalname,
    path: filePath,
  };
}

async function main() {
  console.log('Starting seed mock places script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const uploadService = app.get(UploadService);
  const placesService = app.get(PlacesService);
  const prisma = app.get(PrismaService);

  try {
    // 1. Check Admin
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (!admin) {
      console.error('No SUPER_ADMIN user found. Please run "npm run db:seed:admin" first.');
      process.exit(1);
    }
    console.log(`Using Admin user: ${admin.username} (${admin.id})`);

    // 2. Check Tenant and Area
    const tenant = await prisma.tenant.findUnique({
      where: { code: 'tien-thang' },
    });
    if (!tenant) {
      console.error('Tenant "tien-thang" not found. Please run "npm run tenant:seed:local" first.');
      process.exit(1);
    }

    const area = await prisma.area.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'tien-thang' } },
    });
    if (!area) {
      console.error('Area "tien-thang" not found. Please run "npm run db:seed:areas" first.');
      process.exit(1);
    }
    console.log(`Using Area: ${area.name} (${area.id})`);

    // 3. Check Categories
    const catArchitecture = await prisma.placeCategory.findUnique({
      where: { code: 'ARCHITECTURE' },
    });
    const catCuisine = await prisma.placeCategory.findUnique({
      where: { code: 'CUISINE' },
    });
    if (!catArchitecture || !catCuisine) {
      console.error('Required categories "ARCHITECTURE" or "CUISINE" not found. Please run "npm run db:seed:categories" first.');
      process.exit(1);
    }
    console.log('Categories found successfully.');

    // 4. File uploads
    const imagePath = path.join(process.cwd(), 'data_fake', 'image.png');
    const videoPath = path.join(process.cwd(), 'data_fake', 'video.mp4');

    if (!fs.existsSync(imagePath) || !fs.existsSync(videoPath)) {
      console.error('Required upload files not found in data_fake directory.');
      process.exit(1);
    }

    console.log('Uploading cover image to storage...');
    const imageFile = createMulterFile(imagePath, 'image/png');
    const coverUpload = await uploadService.uploadFile(imageFile, 'images');
    const coverUrl = coverUpload.url;
    console.log('Uploaded cover image:', coverUrl);

    console.log('Uploading intro video to storage...');
    const videoFile = createMulterFile(videoPath, 'video/mp4');
    const videoUpload = await uploadService.uploadFile(videoFile, 'videos');
    const videoUrl = videoUpload.url;
    console.log('Uploaded video:', videoUrl);

    const mockPlacesData = [
      {
        name: 'Đình Bạch Trữ',
        categoryId: catArchitecture.id,
        summary: 'Đình Bạch Trữ xây vào cuối thế kỷ 17, thờ phụng Mỵ Nương (phu nhân Sơn Thánh Tản Viên) và Hoàng Cống tức danh tướng Cống Sơn, quân sư của Nhị vua Hai Bà Trưng) làm thành hoàng làng.',
        description: 'Đình Bạch Trữ thờ Công chúa Thiên Tiên Mỵ Nương và Hoàng Cống Sơn (tướng Hai Bà Trưng). Đây là công trình kiến trúc nghệ thuật điêu khắc gỗ tinh xảo thời Lê Trung Hưng còn lưu giữ được nguyên vẹn.',
        latitude: 21.2018,
        longitude: 105.6925,
        coverUrl: coverUrl,
        videoUrl: videoUrl,
        bestTime: 'Sáng sớm hoặc dịp Lễ hội truyền thống đầu xuân.',
        localTip: 'Hãy chiêm ngưỡng những nét chạm khắc đầu đao gỗ thời Lê cổ kính ẩn sâu dưới mái đình.',
        address: 'Thôn Bạch Trữ, Xã Tiến Thắng, Mê Linh, Hà Nội',
        galleryCaptions: [
          'Cổng đình Bạch Trữ cổ kính',
          'Sân đình và mái ngói',
          'Bên trong chính điện thờ tự'
        ]
      },
      {
        name: 'Đình làng Phú Mỹ',
        categoryId: catArchitecture.id,
        summary: 'Đình Phú Mỹ thuộc xã Tự Lập, huyện Mê Linh cũ nay thuộc xã Tiến Thắng, TP Hà Nội. Đình thờ nhị vị tướng quân của Hai Bà Trưng là cặp vợ chồng Hùng Bảo, Trần Nương.',
        description: 'Đình làng Phú Mỹ là một di tích lịch sử cấp Quốc gia nổi bật, thờ cúng nhị vị tướng quân Hùng Bảo và Trần Nương dưới trướng Hai Bà Trưng.',
        latitude: 21.2085,
        longitude: 105.6525,
        coverUrl: coverUrl,
        videoUrl: videoUrl,
        bestTime: 'Sáng sớm hoặc chiều mát các ngày trong tuần.',
        localTip: 'Quý khách nên mặc trang phục trang nghiêm và đi nhẹ nói khẽ khi tham quan di tích lịch sử.',
        address: 'Thôn Phú Mỹ, Xã Tiến Thắng, Mê Linh, Hà Nội',
        galleryCaptions: [
          'Mặt tiền đình Phú Mỹ cổ kính',
          'Mái ngói điêu khắc cổ',
          'Sân đình rộng lớn'
        ]
      },
      {
        name: 'Mô hình dưa lưới',
        categoryId: catCuisine.id,
        summary: 'Mô hình trồng dưa lưới tại thôn Thanh Vân, xã Tiến Thắng là một trong những điểm sáng về ứng dụng nông nghiệp công nghệ cao, mang lại hiệu quả kinh tế vượt trội cho người nông dân địa phương.',
        description: 'Mô hình ứng dụng nông nghiệp công nghệ cao độc đáo của bà con xã Tiến Thắng, mang lại quả dưa lưới chất lượng chuẩn VietGAP.',
        latitude: 21.2025,
        longitude: 105.6770,
        coverUrl: coverUrl,
        videoUrl: undefined, // no video for melon model
        bestTime: 'Trưa muộn hoặc chiều để tham quan nhà màng công nghệ cao.',
        localTip: 'Trực tiếp mua dưa tại vườn làm quà biếu, rất thơm ngon và giòn ngọt.',
        address: 'Thôn Thanh Vân, Xã Tiến Thắng, Mê Linh, Hà Nội',
        galleryCaptions: [
          'Mô hình dưa lưới tại thôn Thanh Vân',
          'Công nghệ tưới tiêu nhỏ giọt trong nhà màng',
          'Sản xuất dưa lưới ứng dụng chuyển đổi số'
        ]
      }
    ];

    console.log('Seeding places...');
    for (const placeData of mockPlacesData) {
      console.log(`Creating place: ${placeData.name}`);
      
      // Cleanup existing place with same name/slug to allow re-runs
      const existingPlace = await prisma.place.findFirst({
        where: { tenantId: tenant.id, name: placeData.name }
      });
      if (existingPlace) {
        console.log(`  Deleting existing place: ${placeData.name}`);
        await prisma.place.delete({ where: { id: existingPlace.id } });
      }

      const place = await placesService.create({
        name: placeData.name,
        categoryId: placeData.categoryId,
        areaId: area.id,
        summary: placeData.summary,
        description: placeData.description,
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        coverUrl: placeData.coverUrl,
        videoUrl: placeData.videoUrl,
        bestTime: placeData.bestTime,
        localTip: placeData.localTip,
        address: placeData.address,
        priceLevel: 'FREE',
      }, admin.id, tenant);

      console.log(`  Place created with ID: ${place.id}. Adding gallery images...`);

      // Add gallery images
      for (let i = 0; i < placeData.galleryCaptions.length; i++) {
        await placesService.addImage(place.id, {
          imageUrl: coverUrl,
          caption: placeData.galleryCaptions[i],
          sortOrder: i,
        }, tenant);
      }

      console.log(`  Publishing place: ${place.name}...`);
      await placesService.publish(place.id, tenant);
    }

    console.log('Seeding mock places completed successfully.');
  } catch (error) {
    console.error('Failed to seed mock places:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main();
