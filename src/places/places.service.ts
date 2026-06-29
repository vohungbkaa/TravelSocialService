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
import { Prisma, PlaceStatus, PriceLevel } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlaceDto, userId: string) {
    this.validateCosts(dto.estimatedMinCost, dto.estimatedMaxCost);

    // Validate Category exists
    const category = await this.prisma.placeCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }

    // Validate Area exists if provided
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new NotFoundException('AREA_NOT_FOUND');
      }
    }

    const slug = await this.generateUniquePlaceSlug(dto.name);

    return this.prisma.place.create({
      data: {
        name: dto.name,
        slug,
        summary: dto.summary,
        description: dto.description,
        localTip: dto.localTip,
        bestTime: dto.bestTime,
        priceRange: dto.priceRange,
        categoryId: dto.categoryId,
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
    });
  }

  async update(id: string, dto: UpdatePlaceDto) {
    const existing = await this.prisma.place.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    const minCost = dto.estimatedMinCost !== undefined ? dto.estimatedMinCost : existing.estimatedMinCost;
    const maxCost = dto.estimatedMaxCost !== undefined ? dto.estimatedMaxCost : existing.estimatedMaxCost;
    if (minCost !== null && maxCost !== null) {
      this.validateCosts(minCost, maxCost);
    }

    if (dto.categoryId) {
      const category = await this.prisma.placeCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('CATEGORY_NOT_FOUND');
      }
    }

    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new NotFoundException('AREA_NOT_FOUND');
      }
    }

    let slug = existing.slug;
    if (dto.name && dto.name !== existing.name) {
      slug = await this.generateUniquePlaceSlug(dto.name);
    }

    const data: Prisma.PlaceUpdateInput = {
      name: dto.name,
      slug,
      summary: dto.summary,
      description: dto.description,
      localTip: dto.localTip,
      bestTime: dto.bestTime,
      priceRange: dto.priceRange,
      category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
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

    return this.prisma.place.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
      },
    });
  }

  async publish(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
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

    return this.prisma.place.update({
      where: { id },
      data: { status: PlaceStatus.PUBLISHED },
    });
  }

  async unpublish(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return this.prisma.place.update({
      where: { id },
      data: { status: PlaceStatus.DRAFT },
    });
  }

  // --- Place Images Gallery Operations ---

  async addImage(placeId: string, dto: CreatePlaceImageDto) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return this.prisma.placeImage.create({
      data: {
        placeId,
        imageUrl: dto.imageUrl,
        caption: dto.caption,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateImage(placeId: string, imageId: string, dto: UpdatePlaceImageDto) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
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

    return this.prisma.placeImage.update({
      where: { id: imageId },
      data: {
        caption: dto.caption,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteImage(placeId: string, imageId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
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

  async updateMediaLinks(placeId: string, dto: UpdateMediaLinksDto) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
    });
    if (!place) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return this.prisma.place.update({
      where: { id: placeId },
      data: {
        coverUrl: dto.coverUrl,
        videoUrl: dto.videoUrl,
        audioUrl: dto.audioUrl,
      },
    });
  }

  // --- Public APIs ---

  async listCategories() {
    return this.prisma.placeCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findImagesPublic(placeId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
    });
    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return this.prisma.placeImage.findMany({
      where: { placeId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findAllPublic(query: ListPlacesQueryDto) {
    const { q, areaSlug, areaId, category, provinceCode, priceLevel, limit = 20, cursor, sort } = query;

    const where: Prisma.PlaceWhereInput = {
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
      where.area = { slug: areaSlug };
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
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const nextCursor = places.length === limit ? places[places.length - 1].id : null;

    return {
      places,
      nextCursor,
    };
  }

  async findOnePublic(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return place;
  }

  async findOnePublicBySlug(slug: string) {
    const place = await this.prisma.place.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!place || place.status !== PlaceStatus.PUBLISHED) {
      throw new NotFoundException('PLACE_NOT_FOUND');
    }

    return place;
  }

  // --- Helpers ---

  private validateCosts(min?: number | null, max?: number | null) {
    if (min !== undefined && max !== undefined && min !== null && max !== null) {
      if (min > max) {
        throw new BadRequestException('MIN_COST_EXCEEDS_MAX_COST');
      }
    }
  }

  private async generateUniquePlaceSlug(name: string): Promise<string> {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let count = 0;

    while (true) {
      const existing = await this.prisma.place.findUnique({
        where: { slug },
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
