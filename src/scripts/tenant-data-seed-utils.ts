import { MarkerIcon, PrismaClient } from '@prisma/client';
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { PlacesService } from '../places/places.service';
import { UploadService } from '../upload/upload.service';
import { getTenantCodes, getTenantData } from './seed-data/tenants';
import { TenantDataSeed, TenantPlaceSeed } from './seed-data/tenants/types';
import { upsertTenantAdmin, upsertTenantBundle } from './tenant-script-utils';

export function getRequestedTenantCodes(): string[] {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  const code = (arg || process.env.TENANT_CODE)?.trim().toLowerCase();
  if (!code || code === 'all') {
    return getTenantCodes();
  }
  return [code];
}

function createMulterFile(filePath: string, mimetype: string): Express.Multer.File {
  const originalname = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);

  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: originalname,
    path: filePath,
  };
}

export async function seedTenantBase(prisma: PrismaClient, seed: TenantDataSeed) {
  const { tenant, area } = await upsertTenantBundle(prisma, seed.tenant);
  console.log(`Tenant base ready: ${tenant.code} (${tenant.domain}), area=${area.slug}`);
  return { tenant, area };
}

export async function seedTenantAdmins(prisma: PrismaClient, seed: TenantDataSeed) {
  for (const admin of seed.admins) {
    const { tenant, user, membership } = await upsertTenantAdmin(prisma, {
      tenantCode: seed.tenant.code,
      email: admin.email,
      username: admin.username,
      password: admin.password,
      displayName: admin.displayName,
      tenantRole: admin.role,
    });
    console.log(`Tenant admin ready: ${user.username} -> ${tenant.code} (${membership.role})`);
  }
}

export async function seedTenantCategories(prisma: PrismaClient, seed: TenantDataSeed) {
  const markerIconByKey = new Map<string, MarkerIcon>();
  for (const icon of seed.markerIcons) {
    const markerIcon = await prisma.markerIcon.upsert({
      where: { key: icon.key },
      update: {
        name: icon.name,
        iconUrl: icon.iconUrl,
        markerColor: icon.markerColor,
        active: icon.active ?? true,
      },
      create: {
        key: icon.key,
        name: icon.name,
        iconUrl: icon.iconUrl,
        markerColor: icon.markerColor,
        active: icon.active ?? true,
      },
    });
    markerIconByKey.set(icon.key, markerIcon);
  }

  for (const category of seed.categories) {
    const markerIcon = markerIconByKey.get(category.markerIconKey);
    if (!markerIcon) {
      throw new Error(`Missing marker icon seed: ${category.markerIconKey}`);
    }

    await prisma.placeCategory.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        icon: markerIcon.key,
        iconUrl: markerIcon.iconUrl,
        markerColor: markerIcon.markerColor,
        markerIconId: markerIcon.id,
        active: category.active ?? true,
      },
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        icon: markerIcon.key,
        iconUrl: markerIcon.iconUrl,
        markerColor: markerIcon.markerColor,
        markerIconId: markerIcon.id,
        active: category.active ?? true,
      },
    });
  }

  console.log(`Categories ready for seed source: ${seed.tenant.code}`);
}

async function resolveSeedMedia(uploadService: UploadService) {
  const imagePath = path.join(process.cwd(), 'data_fake', 'image.png');
  const videoPath = path.join(process.cwd(), 'data_fake', 'video.mp4');

  const result: { coverUrl?: string; videoUrl?: string } = {};
  if (fs.existsSync(imagePath)) {
    result.coverUrl = (await uploadService.uploadFile(createMulterFile(imagePath, 'image/png'), 'images')).url;
  }
  if (fs.existsSync(videoPath)) {
    result.videoUrl = (await uploadService.uploadFile(createMulterFile(videoPath, 'video/mp4'), 'videos')).url;
  }
  return result;
}

export async function seedTenantPlaces(seed: TenantDataSeed) {
  if (seed.places.length === 0) {
    console.log(`No place seeds for tenant: ${seed.tenant.code}`);
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const prisma = app.get(PrismaService);
    const placesService = app.get(PlacesService);
    const uploadService = app.get(UploadService);
    const media = await resolveSeedMedia(uploadService);

    const admin = await prisma.user.findFirst({
      where: {
        tenants: {
          some: {
            tenant: { code: seed.tenant.code },
            active: true,
          },
        },
      },
    }) || await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin) {
      throw new Error('No admin user found. Seed system admin or tenant admins first.');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { code: seed.tenant.code },
    });
    if (!tenant) {
      throw new Error(`Tenant not found: ${seed.tenant.code}`);
    }

    for (const placeSeed of seed.places) {
      await seedOnePlace(prisma, placesService, tenant, admin.id, placeSeed, media);
    }
  } finally {
    await app.close();
  }
}

async function seedOnePlace(
  prisma: PrismaService,
  placesService: PlacesService,
  tenant: { id: string; code: string; name: string; domain: string; enabled: boolean; theme: any; settings: any; createdAt: Date; updatedAt: Date },
  adminId: string,
  placeSeed: TenantPlaceSeed,
  media: { coverUrl?: string; videoUrl?: string },
) {
  const areaSlug = placeSeed.areaSlug || seedDefaultAreaSlug(tenant.settings) || tenant.code;
  const area = await prisma.area.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: areaSlug } },
  });
  if (!area) {
    throw new Error(`Area not found for tenant=${tenant.code}, areaSlug=${areaSlug}`);
  }

  const category = await prisma.placeCategory.findUnique({
    where: { code: placeSeed.categoryCode },
  });
  if (!category) {
    throw new Error(`Category not found: ${placeSeed.categoryCode}`);
  }

  const existingPlace = await prisma.place.findFirst({
    where: { tenantId: tenant.id, name: placeSeed.name },
  });
  if (existingPlace) {
    await prisma.place.delete({ where: { id: existingPlace.id } });
  }

  const place = await placesService.create({
    name: placeSeed.name,
    categoryId: category.id,
    areaId: area.id,
    summary: placeSeed.summary,
    description: placeSeed.description,
    latitude: placeSeed.latitude,
    longitude: placeSeed.longitude,
    coverUrl: placeSeed.coverUrl || media.coverUrl,
    videoUrl: placeSeed.videoUrl || media.videoUrl,
    audioUrl: placeSeed.audioUrl,
    bestTime: placeSeed.bestTime,
    localTip: placeSeed.localTip,
    address: placeSeed.address,
    priceLevel: placeSeed.priceLevel || 'FREE',
  }, adminId, tenant);

  const galleryCaptions = placeSeed.galleryCaptions || [];
  for (let i = 0; i < galleryCaptions.length; i += 1) {
    await placesService.addImage(place.id, {
      imageUrl: placeSeed.coverUrl || media.coverUrl || '',
      caption: galleryCaptions[i],
      sortOrder: i,
    }, tenant);
  }

  if (placeSeed.published ?? true) {
    await placesService.publish(place.id, tenant);
  }

  console.log(`Place ready: ${tenant.code}/${place.name}`);
}

function seedDefaultAreaSlug(settings: unknown): string | undefined {
  if (settings && typeof settings === 'object' && 'defaultAreaSlug' in settings) {
    const value = (settings as { defaultAreaSlug?: unknown }).defaultAreaSlug;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

export async function runForRequestedTenants(
  action: (prisma: PrismaClient, seed: TenantDataSeed) => Promise<void>,
) {
  const prisma = new PrismaClient();
  try {
    for (const code of getRequestedTenantCodes()) {
      await action(prisma, getTenantData(code));
    }
  } finally {
    await prisma.$disconnect();
  }
}
