import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { slugify } from '../common/utils/slugify';
import { Prisma } from '@prisma/client';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAreaDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    const existing = await this.prisma.area.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException('SLUG_ALREADY_EXISTS');
    }

    const area = await this.prisma.area.create({
      data: {
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

    return area;
  }

  async findAllAdmin() {
    return this.prisma.area.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
    });
    if (!area) {
      throw new NotFoundException('AREA_NOT_FOUND');
    }
    return area;
  }

  async update(id: string, dto: UpdateAreaDto) {
    const existingArea = await this.findOneAdmin(id);

    let slug = existingArea.slug;
    if (dto.slug) {
      slug = slugify(dto.slug);
    }

    if (slug !== existingArea.slug) {
      const existingSlug = await this.prisma.area.findUnique({
        where: { slug },
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

    return this.prisma.area.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOneAdmin(id);

    const placesCount = await this.prisma.place.count({
      where: { areaId: id },
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

  async findAllPublic() {
    return this.prisma.area.findMany({
      where: { published: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOnePublic(slug: string) {
    const area = await this.prisma.area.findUnique({
      where: { slug },
    });

    if (!area || !area.published) {
      throw new NotFoundException('AREA_NOT_FOUND');
    }

    return area;
  }

  async findPlacesPublic(slug: string) {
    const area = await this.findOnePublic(slug);

    return this.prisma.place.findMany({
      where: {
        areaId: area.id,
        status: 'PUBLISHED',
      },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
