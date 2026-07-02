import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { CreatePlaceImageDto, UpdatePlaceImageDto } from './dto/place-image.dto';
import { UpdateMediaLinksDto } from './dto/media-links.dto';
import { ListPlacesQueryDto } from './dto/list-places-query.dto';
import { slugify } from '../common/utils/slugify';
import { normalizeMediaUrls } from '../common/utils/media-url';
import { Prisma, PlaceStatus, PriceLevel } from '@prisma/client';
import * as crypto from 'crypto';
import { TenantContext } from '../tenants/tenant-context.type';
import { TenantsService } from '../tenants/tenants.service';

const placeInclude = {
  category: { include: { markerIcon: true } },
  markerIcon: true,
  images: true,
} satisfies Prisma.PlaceInclude;

const placeListInclude = {
  category: { include: { markerIcon: true } },
  markerIcon: true,
  area: true,
  images: {
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.PlaceInclude;

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(dto: CreatePlaceDto, userId: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    this.validateCosts(dto.estimatedMinCost, dto.estimatedMaxCost);

    // Validate or assign Category
    let categoryId = dto.categoryId;
    if (!categoryId) {
      let uncategorized = await this.prisma.placeCategory.findUnique({
        where: { code: 'uncategorized' },
      });
      if (!uncategorized) {
        uncategorized = await this.prisma.placeCategory.create({
          data: {
            code: 'uncategorized',
            name: 'Chưa phân loại',
            description: 'Danh mục mặc định khi không chọn phân loại',
          },
        });
      }
      categoryId = uncategorized.id;
    } else {
      const category = await this.prisma.placeCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException('CATEGORY_NOT_FOUND');
      }
    }

    // Validate Area exists if provided
    if (dto.areaId) {
      const area = await this.prisma.area.findFirst({
        where: { id: dto.areaId, tenantId: currentTenant.id },
      });
      if (!area) {
        throw new NotFoundException('AREA_NOT_FOUND');
      }
    }

    await this.validateMarkerIcon(dto.markerIconId);

    const slug = await this.generateUniquePlaceSlug(dto.name, currentTenant.id);

    const place = await this.prisma.place.create({
      data: {
        tenantId: currentTenant.id,
        name: dto.name,
        slug,
        summary: dto.summary,
        description: dto.description,
        localTip: dto.localTip,
        bestTime: dto.bestTime,
        priceRange: dto.priceRange,
        categoryId: categoryId,
        markerIconId: dto.markerIconId || null,
        areaId: dto.areaId,
        address: dto.address,
        provinceCode: dto.provinceCode,
        districtCode: dto.districtCode,
        wardCode: dto.wardCode,
        latitude: dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? new Prisma.Decimal(dto.longitude) : null,
        priceLevel: dto.priceLevel,
        estimatedMinCost: dto.estimatedMinCost,
        estimatedMaxCost: dto.estimatedMaxCost,
        averageVisitDurationMinutes: dto.averageVisitDurationMinutes,
        openingHours: dto.openingHours ?? Prisma.JsonNull,
        coverUrl: dto.coverUrl,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
        sortOrder: dto.sortOrder ?? 0,
        status: PlaceStatus.DRAFT,
        createdBy: userId,
      },
      include: placeInclude,
    });

    return normalizeMediaUrls(place);
  }

  async update(id: string, dto: UpdatePlaceDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const existing = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
    });
    if (!existing) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const minCost = dto.estimatedMinCost !== undefined ? dto.estimatedMinCost : existing.estimatedMinCost;
    const maxCost = dto.estimatedMaxCost !== undefined ? dto.estimatedMaxCost : existing.estimatedMaxCost;
    if (minCost !== null && maxCost !== null) {
      this.validateCosts(minCost, maxCost);
    }

    let categoryConnect = undefined;
    if (dto.categoryId !== undefined) {
      let catId = dto.categoryId;
      if (!catId) {
        let uncategorized = await this.prisma.placeCategory.findUnique({
          where: { code: 'uncategorized' },
        });
        if (!uncategorized) {
          uncategorized = await this.prisma.placeCategory.create({
            data: {
              code: 'uncategorized',
              name: 'Chưa phân loại',
              description: 'Danh mục mặc định khi không chọn phân loại',
            },
          });
        }
        catId = uncategorized.id;
      } else {
        const category = await this.prisma.placeCategory.findUnique({
          where: { id: catId },
        });
        if (!category) {
          throw new NotFoundException('CATEGORY_NOT_FOUND');
        }
      }
      categoryConnect = { connect: { id: catId } };
    }

    if (dto.areaId) {
      const area = await this.prisma.area.findFirst({
        where: { id: dto.areaId, tenantId: currentTenant.id },
      });
      if (!area) {
        throw new NotFoundException('AREA_NOT_FOUND');
      }
    }

    await this.validateMarkerIcon(dto.markerIconId);

    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      slug = await this.generateUniquePlaceSlug(dto.name, currentTenant.id);
    }

    const data: Prisma.PlaceUpdateInput = {
      name: dto.name,
      slug,
      summary: dto.summary,
      description: dto.description,
      localTip: dto.localTip,
      bestTime: dto.bestTime,
      priceRange: dto.priceRange,
      category: categoryConnect,
      markerIcon: dto.markerIconId !== undefined
        ? (dto.markerIconId ? { connect: { id: dto.markerIconId } } : { disconnect: true })
        : undefined,
      area: dto.areaId !== undefined
        ? (dto.areaId !== null ? { connect: { id: dto.areaId } } : { disconnect: true })
        : undefined,
      address: dto.address,
      provinceCode: dto.provinceCode,
      districtCode: dto.districtCode,
      wardCode: dto.wardCode,
      priceLevel: dto.priceLevel,
      estimatedMinCost: dto.estimatedMinCost,
      estimatedMaxCost: dto.estimatedMaxCost,
      averageVisitDurationMinutes: dto.averageVisitDurationMinutes,
      openingHours: dto.openingHours !== undefined ? dto.openingHours : undefined,
      coverUrl: dto.coverUrl,
      videoUrl: dto.videoUrl,
      audioUrl: dto.audioUrl,
      sortOrder: dto.sortOrder,
    };

    if (dto.latitude !== undefined) {
      data.latitude = dto.latitude !== null ? new Prisma.Decimal(dto.latitude) : null;
    }
    if (dto.longitude !== undefined) {
      data.longitude = dto.longitude !== null ? new Prisma.Decimal(dto.longitude) : null;
    }

    const place = await this.prisma.place.update({
      where: { id },
      data,
      include: placeInclude,
    });

    return normalizeMediaUrls(place);
  }

  async publish(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    // Validation to publish: name, category, lat, lng, areaId are required
    if (
      !place.name ||
      !place.categoryId ||
      place.latitude === null ||
      place.longitude === null ||
      !place.areaId
    ) {
      throw new BadRequestException('PLACE_INCOMPLETE_FOR_PUBLISHING');
    }

    const updatedPlace = await this.prisma.place.update({
      where: { id },
      data: { status: PlaceStatus.PUBLISHED },
    });

    return normalizeMediaUrls(updatedPlace);
  }

  async unpublish(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const updatedPlace = await this.prisma.place.update({
      where: { id },
      data: { status: PlaceStatus.DRAFT },
    });

    return normalizeMediaUrls(updatedPlace);
  }

  async findAllAdmin(tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const places = await this.prisma.place.findMany({
      where: { tenantId: currentTenant.id },
      include: placeListInclude,
      orderBy: { createdAt: 'desc' },
    });

    return normalizeMediaUrls(places);
  }

  async findOneAdmin(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
      include: placeListInclude,
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }
    return normalizeMediaUrls(place);
  }

  async remove(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }
    await this.prisma.place.delete({
      where: { id },
    });
    return { success: true };
  }


  // --- Place Images Gallery Operations ---

  async addImage(placeId: string, dto: CreatePlaceImageDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const image = await this.prisma.placeImage.create({
      data: {
        placeId,
        imageUrl: dto.imageUrl,
        caption: dto.caption,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return normalizeMediaUrls(image);
  }

  async updateImage(placeId: string, imageId: string, dto: UpdatePlaceImageDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const image = await this.prisma.placeImage.findFirst({
      where: { id: imageId, placeId },
    });
    if (!image) {
      throw new NotFoundException('IMAGE_NOT_FOUND');
    }

    const updatedImage = await this.prisma.placeImage.update({
      where: { id: imageId },
      data: {
        caption: dto.caption,
        sortOrder: dto.sortOrder,
      },
    });

    return normalizeMediaUrls(updatedImage);
  }

  async deleteImage(placeId: string, imageId: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const image = await this.prisma.placeImage.findFirst({
      where: { id: imageId, placeId },
    });
    if (!image) {
      throw new NotFoundException('IMAGE_NOT_FOUND');
    }

    await this.prisma.placeImage.delete({
      where: { id: imageId },
    });

    return { success: true };
  }

  async updateMediaLinks(placeId: string, dto: UpdateMediaLinksDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, tenantId: currentTenant.id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const updatedPlace = await this.prisma.place.update({
      where: { id: placeId },
      data: {
        coverUrl: dto.coverUrl,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
      },
    });

    return normalizeMediaUrls(updatedPlace);
  }

  // --- Public APIs ---

  async listCategories() {
    const categories = await this.prisma.placeCategory.findMany({
      where: { active: true },
      include: { markerIcon: true },
      orderBy: { name: 'asc' },
    });
    return categories.map((category) => this.withCategoryIconAsset(category));
  }

  async findImagesPublic(placeId: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, tenantId: currentTenant.id },
    });
    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const images = await this.prisma.placeImage.findMany({
      where: { placeId },
      orderBy: { sortOrder: 'asc' },
    });

    return normalizeMediaUrls(images);
  }

  async findAllPublic(query: ListPlacesQueryDto, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const { q, areaSlug, areaId, category, provinceCode, priceLevel, limit = 20, cursor, sort } = query;

    const where: Prisma.PlaceWhereInput = {
      tenantId: currentTenant.id,
      status: PlaceStatus.PUBLISHED,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (areaId) {
      where.areaId = areaId;
    } else if (areaSlug) {
      where.area = { tenantId: currentTenant.id, slug: areaSlug };
    }

    if (category) {
      where.category = { code: category };
    }

    if (provinceCode) {
      where.provinceCode = provinceCode;
    }

    if (priceLevel) {
      where.priceLevel = priceLevel;
    }

    const take = limit;
    let orderBy: Prisma.PlaceOrderByWithRelationInput | Prisma.PlaceOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ];

    if (sort === 'newest') {
      orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];
    } else if (sort === 'rating') {
      orderBy = [{ ratingAvg: 'desc' }, { id: 'asc' }];
    }

    const places = await this.prisma.place.findMany({
      where,
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy,
      include: placeInclude,
    });

    const nextCursor = places.length === limit ? places[places.length - 1].id : null;

    return {
      places: normalizeMediaUrls(places),
      nextCursor,
    };
  }

  async findOnePublic(id: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findFirst({
      where: { id, tenantId: currentTenant.id },
      include: placeInclude,
    });

    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return normalizeMediaUrls(place);
  }

  async findOnePublicBySlug(slug: string, tenant?: TenantContext) {
    const currentTenant = await this.tenantsService.requireTenant(tenant);
    const place = await this.prisma.place.findUnique({
      where: { tenantId_slug: { tenantId: currentTenant.id, slug } },
      include: placeInclude,
    });

    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return normalizeMediaUrls(place);
  }

  async createCategory(dto: {
    code?: string;
    name: string;
    description?: string;
    icon?: string;
    iconUrl?: string;
    markerColor?: string;
    markerIconId?: number;
  }) {
    let code: string | undefined = undefined;
    if (dto.code) {
      code = dto.code.trim();
      const existing = await this.prisma.placeCategory.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException('CATEGORY_CODE_ALREADY_EXISTS');
      }
    }
    const markerIcon = dto.markerIconId
      ? await this.prisma.markerIcon.findUnique({
          where: { id: dto.markerIconId },
        })
      : null;

    if (dto.markerIconId && !markerIcon) {
      throw new NotFoundException('MARKER_ICON_NOT_FOUND');
    }

    const category = await this.prisma.placeCategory.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        icon: markerIcon?.key || dto.icon,
        iconUrl: markerIcon?.iconUrl || dto.iconUrl || this.getIconifyUrl(dto.icon),
        markerColor: markerIcon?.markerColor || dto.markerColor || this.getDefaultMarkerColor(),
        markerIcon: dto.markerIconId ? { connect: { id: dto.markerIconId } } : undefined,
      },
      include: { markerIcon: true },
    });

    return this.withCategoryIconAsset(category);
  }

  async listCategoriesAdmin() {
    const categories = await this.prisma.placeCategory.findMany({
      include: { markerIcon: true },
      orderBy: { name: 'asc' },
    });
    return categories.map((category) => this.withCategoryIconAsset(category));
  }

  async updateCategory(id: number, active: boolean) {
    const existing = await this.prisma.placeCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    const category = await this.prisma.placeCategory.update({
      where: { id },
      data: { active },
    });
    return this.withCategoryIconAsset(category);
  }

  async listMarkerIcons() {
    return this.prisma.markerIcon.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createMarkerIcon(dto: {
    key: string;
    name: string;
    iconUrl: string;
    markerColor: string;
    active?: boolean;
  }) {
    const key = dto.key?.trim();
    const name = dto.name?.trim();
    const iconUrl = dto.iconUrl?.trim();
    const markerColor = dto.markerColor?.trim();

    if (!key || !/^[a-z0-9-]+$/i.test(key)) {
      throw new BadRequestException('INVALID_MARKER_ICON_KEY');
    }
    if (!name) {
      throw new BadRequestException('MARKER_ICON_NAME_REQUIRED');
    }
    if (!iconUrl) {
      throw new BadRequestException('MARKER_ICON_URL_REQUIRED');
    }
    if (!/^#[0-9a-f]{6}$/i.test(markerColor)) {
      throw new BadRequestException('INVALID_MARKER_COLOR');
    }

    return this.prisma.markerIcon.create({
      data: {
        key,
        name,
        iconUrl,
        markerColor,
        active: dto.active ?? true,
      },
    });
  }

  // --- Helpers ---

  private withCategoryIconAsset<T extends {
    icon?: string | null;
    iconUrl?: string | null;
    markerColor?: string | null;
    markerIcon?: { iconUrl: string; markerColor: string } | null;
  }>(category: T): T {
    return {
      ...category,
      iconUrl: category.markerIcon?.iconUrl || category.iconUrl || this.getIconifyUrl(category.icon),
      markerColor: category.markerIcon?.markerColor || category.markerColor || this.getDefaultMarkerColor(),
    };
  }

  private getIconifyUrl(icon?: string | null) {
    const safeIcon = icon && /^[a-z0-9-]+$/i.test(icon) ? icon : 'map-pin';
    return `https://api.iconify.design/lucide:${safeIcon}.svg?color=%23ffffff`;
  }

  private getDefaultMarkerColor() {
    return '#6366f1';
  }

  private async validateMarkerIcon(markerIconId?: number | null) {
    if (!markerIconId) {
      return;
    }

    const markerIcon = await this.prisma.markerIcon.findUnique({
      where: { id: markerIconId },
    });
    if (!markerIcon) {
      throw new NotFoundException('MARKER_ICON_NOT_FOUND');
    }
  }

  private validateCosts(min?: number | null, max?: number | null) {
    if (min !== undefined && max !== undefined && min !== null && max !== null) {
      if (min > max) {
        throw new BadRequestException('MIN_COST_EXCEEDS_MAX_COST');
      }
    }
  }

  private async generateUniquePlaceSlug(name: string, tenantId: string): Promise<string> {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let count = 0;

    while (true) {
      const existing = await this.prisma.place.findUnique({
        where: { tenantId_slug: { tenantId, slug } },
      });

      if (!existing) {
        return slug;
      }

      count++;
      slug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;

      if (count > 10) {
        return `${baseSlug}-${Date.now()}`;
      }
    }
  }
}
