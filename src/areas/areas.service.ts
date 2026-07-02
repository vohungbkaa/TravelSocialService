import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { slugify } from '../common/utils/slugify';
import { normalizeMediaUrls } from '../common/utils/media-url';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../tenants/tenant-context.type';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(dto: CreateAreaDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    const existing = await this.prisma.area.findUnique({
      where: { tenantId_slug: { tenantId: currentTenant.id, slug } },
    });
    if (existing) {
      throw new ConflictException('SLUG_ALREADY_EXISTS');
    }

    const area = await this.prisma.area.create({
      data: {
        tenantId: currentTenant.id,
        name: dto.name,
        slug,
        provinceCode: dto.provinceCode,
        description: dto.description,
        coverUrl: dto.coverUrl,
        centerLat: new Prisma.Decimal(dto.centerLat),
        centerLng: new Prisma.Decimal(dto.centerLng),
        defaultRadiusKm: dto.defaultRadiusKm !== undefined ? new Prisma.Decimal(dto.defaultRadiusKm) : undefined,
        published: dto.published ?? false,
      },
    });

    return normalizeMediaUrls(area);
  }

  async findAllAdmin(tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const areas = await this.prisma.area.findMany({
      where: { tenantId: currentTenant.id },
      orderBy: { createdAt: 'desc' },
    });
    return normalizeMediaUrls(areas);
  }

  async findOneAdmin(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const area = await this.prisma.area.findFirst({
      where: { id, tenantId: currentTenant.id },
    });
    if (!area) {
      throw new NotFoundException('AREA_NOT_FOUND');
    }
    return normalizeMediaUrls(area);
  }

  async update(id: string, dto: UpdateAreaDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const existingArea = await this.findOneAdmin(id, currentTenant);

    let slug = existingArea.slug;
    if (dto.slug) {
      slug = slugify(dto.slug);
    }

    if (slug !== existingArea.slug) {
      const existingSlug = await this.prisma.area.findUnique({
        where: { tenantId_slug: { tenantId: currentTenant.id, slug } },
      });
      if (existingSlug) {
        throw new ConflictException('SLUG_ALREADY_EXISTS');
      }
    }

    const data: Prisma.AreaUpdateInput = {
      name: dto.name,
      slug,
      provinceCode: dto.provinceCode,
      description: dto.description,
      coverUrl: dto.coverUrl,
      published: dto.published,
    };

    if (dto.centerLat !== undefined) {
      data.centerLat = new Prisma.Decimal(dto.centerLat);
    }
    if (dto.centerLng !== undefined) {
      data.centerLng = new Prisma.Decimal(dto.centerLng);
    }
    if (dto.defaultRadiusKm !== undefined) {
      data.defaultRadiusKm = new Prisma.Decimal(dto.defaultRadiusKm);
    }

    const area = await this.prisma.area.update({
      where: { id },
      data,
    });
    return normalizeMediaUrls(area);
  }

  async remove(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    await this.findOneAdmin(id, currentTenant);

    const placesCount = await this.prisma.place.count({
      where: { areaId: id, tenantId: currentTenant.id },
    });

    if (placesCount > 0) {
      throw new BadRequestException('AREA_HAS_PLACES');
    }

    await this.prisma.area.delete({
      where: { id },
    });

    return { success: true };
  }

  // --- Public APIs ---

  async findAllPublic(tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const areas = await this.prisma.area.findMany({
      where: { tenantId: currentTenant.id, published: true },
      orderBy: { name: 'asc' },
    });
    return normalizeMediaUrls(areas);
  }

  async findOnePublic(slug: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const area = await this.prisma.area.findUnique({
      where: { tenantId_slug: { tenantId: currentTenant.id, slug } },
    });

    if (!area || !area.published) {
      throw new NotFoundException('AREA_NOT_FOUND');
    }

    return normalizeMediaUrls(area);
  }

  async findPlacesPublic(slug: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const area = await this.findOnePublic(slug, currentTenant);

    const places = await this.prisma.place.findMany({
      where: {
        tenantId: currentTenant.id,
        areaId: area.id,
        status: 'PUBLISHED',
      },
      include: {
        category: { include: { markerIcon: true } },
        markerIcon: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return normalizeMediaUrls(places);
  }

  async getMapConfig(slug: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const area = await this.findOnePublic(slug, currentTenant);
    const layers = await this.prisma.tenantMapLayer.findMany({
      where: {
        tenantId: currentTenant.id,
        areaId: area.id,
        enabled: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const boundary = layers.find((layer) => layer.type === 'BOUNDARY') || layers[0];

    return {
      slug: area.slug,
      name: area.name,
      provinceCode: area.provinceCode,
      level: area.provinceCode ? 'province' : 'ward',
      center: [Number(area.centerLng), Number(area.centerLat)],
      zoom: boundary?.zoom ? Number(boundary.zoom) : 13,
      bounds: boundary?.bounds || undefined,
      description: area.description,
      boundaryGeoJson: boundary?.geoJson || undefined,
      boundaryGeoJsonUrl: boundary?.geoJsonUrl || undefined,
      layers: layers.map((layer) => ({
        key: layer.key,
        type: layer.type,
        name: layer.name,
        geoJson: layer.geoJson,
        geoJsonUrl: layer.geoJsonUrl,
        style: layer.style,
      })),
    };
  }
}
