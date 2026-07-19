import {
  Prisma,
  PrismaClient,
  TenantUserRole,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { TENANT_DATA } from './seed-data/tenants';

export const DEFAULT_FEATURES = [
  'places',
  'public_map',
  'admin_area_crud',
  'reviews',
  'posts',
  'module_x',
];

export interface TenantSeedInput {
  code: string;
  name: string;
  domain: string;
  area: {
    slug: string;
    name: string;
    provinceCode?: string;
    description?: string;
    centerLat: number;
    centerLng: number;
    defaultRadiusKm: number;
    published: boolean;
  };
  mapLayer?: {
    key: string;
    name: string;
    geoJsonFile?: string;
    bounds?: [[number, number], [number, number]];
    zoom?: number;
    style?: Prisma.InputJsonValue;
  };
  theme?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
  features?: Record<string, boolean>;
}

export function getEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function readSeedGeoJson(fileName: string): Prisma.InputJsonValue {
  const filePath = path.join(
    process.cwd(),
    'src',
    'scripts',
    'seed-data',
    fileName,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Prisma.InputJsonValue;
}

export async function upsertTenantBundle(
  prisma: PrismaClient,
  input: TenantSeedInput,
) {
  const tenant = await prisma.tenant.upsert({
    where: { code: input.code },
    update: {
      name: input.name,
      domain: input.domain,
      enabled: true,
      theme: input.theme ?? Prisma.JsonNull,
      settings: input.settings ?? Prisma.JsonNull,
    },
    create: {
      code: input.code,
      name: input.name,
      domain: input.domain,
      enabled: true,
      theme: input.theme ?? Prisma.JsonNull,
      settings: input.settings ?? Prisma.JsonNull,
    },
  });

  const featureConfig =
    input.features ||
    Object.fromEntries(DEFAULT_FEATURES.map((feature) => [feature, true]));
  for (const [feature, enabled] of Object.entries(featureConfig)) {
    await prisma.tenantFeature.upsert({
      where: {
        tenantId_feature: {
          tenantId: tenant.id,
          feature,
        },
      },
      update: { enabled },
      create: {
        tenantId: tenant.id,
        feature,
        enabled,
      },
    });
  }

  const area = await prisma.area.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: input.area.slug,
      },
    },
    update: {
      name: input.area.name,
      provinceCode: input.area.provinceCode,
      description: input.area.description,
      centerLat: new Prisma.Decimal(input.area.centerLat),
      centerLng: new Prisma.Decimal(input.area.centerLng),
      defaultRadiusKm: new Prisma.Decimal(input.area.defaultRadiusKm),
      published: input.area.published,
    },
    create: {
      tenantId: tenant.id,
      slug: input.area.slug,
      name: input.area.name,
      provinceCode: input.area.provinceCode,
      description: input.area.description,
      centerLat: new Prisma.Decimal(input.area.centerLat),
      centerLng: new Prisma.Decimal(input.area.centerLng),
      defaultRadiusKm: new Prisma.Decimal(input.area.defaultRadiusKm),
      published: input.area.published,
    },
  });

  if (input.mapLayer) {
    await prisma.tenantMapLayer.upsert({
      where: {
        tenantId_key: {
          tenantId: tenant.id,
          key: input.mapLayer.key,
        },
      },
      update: {
        areaId: area.id,
        name: input.mapLayer.name,
        enabled: true,
        geoJson: input.mapLayer.geoJsonFile
          ? readSeedGeoJson(input.mapLayer.geoJsonFile)
          : undefined,
        style: input.mapLayer.style ?? Prisma.JsonNull,
        bounds: input.mapLayer.bounds as Prisma.InputJsonValue | undefined,
        centerLat: new Prisma.Decimal(input.area.centerLat),
        centerLng: new Prisma.Decimal(input.area.centerLng),
        zoom: input.mapLayer.zoom
          ? new Prisma.Decimal(input.mapLayer.zoom)
          : undefined,
      },
      create: {
        tenantId: tenant.id,
        areaId: area.id,
        key: input.mapLayer.key,
        name: input.mapLayer.name,
        type: 'BOUNDARY',
        enabled: true,
        geoJson: input.mapLayer.geoJsonFile
          ? readSeedGeoJson(input.mapLayer.geoJsonFile)
          : Prisma.JsonNull,
        style: input.mapLayer.style ?? Prisma.JsonNull,
        bounds: input.mapLayer.bounds as Prisma.InputJsonValue | undefined,
        centerLat: new Prisma.Decimal(input.area.centerLat),
        centerLng: new Prisma.Decimal(input.area.centerLng),
        zoom: input.mapLayer.zoom
          ? new Prisma.Decimal(input.mapLayer.zoom)
          : undefined,
      },
    });
  }

  return { tenant, area };
}

export async function upsertTenantAdmin(
  prisma: PrismaClient,
  input: {
    tenantCode: string;
    email: string;
    username: string;
    password?: string;
    displayName: string;
    tenantRole: TenantUserRole;
  },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { code: input.tenantCode },
  });
  if (!tenant) {
    throw new Error(`Tenant not found: ${input.tenantCode}`);
  }

  const normalizedEmail = input.email.toLowerCase();
  const normalizedUsername = input.username.toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 10)
    : undefined;

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role:
            existingUser.role === UserRole.SUPER_ADMIN
              ? UserRole.SUPER_ADMIN
              : UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          passwordHash: passwordHash || existingUser.passwordHash,
        },
      })
    : await prisma.user.create({
        data: {
          email: normalizedEmail,
          username: normalizedUsername,
          passwordHash,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              fullName: input.displayName,
            },
          },
        },
      });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { fullName: input.displayName },
    create: {
      userId: user.id,
      fullName: input.displayName,
    },
  });

  const membership = await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {
      role: input.tenantRole,
      active: true,
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: input.tenantRole,
      active: true,
    },
  });

  return { tenant, user, membership };
}

export const LOCAL_TENANTS: TenantSeedInput[] = Object.values(TENANT_DATA).map(
  (seed) => seed.tenant,
);
