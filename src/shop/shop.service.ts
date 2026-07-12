import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { normalizeMediaUrls } from '../common/utils/media-url';
import type { TenantContext } from '../tenants/tenant-context.type';
import { CreateShopCategoryDto } from './dto/create-shop-category.dto';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { ListShopProductsQueryDto } from './dto/list-shop-products-query.dto';

const productInclude = {
  category: true,
  images: {
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.ShopProductInclude;

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(tenant: TenantContext) {
    return this.prisma.shopCategory.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateShopCategoryDto, tenant: TenantContext) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    try {
      return await this.prisma.shopCategory.create({
        data: {
          tenantId: tenant.id,
          name,
          description: dto.description?.trim() || null,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('SHOP_CATEGORY_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  async listProducts(query: ListShopProductsQueryDto, tenant: TenantContext) {
    const { q, category, categoryId, limit = 20, cursor } = query;
    const where: Prisma.ShopProductWhereInput = {
      tenantId: tenant.id,
      active: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (category && category !== 'Tất cả') {
      where.category = {
        tenantId: tenant.id,
        name: category,
        active: true,
      };
    }

    const search = q?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { origin: { contains: search, mode: 'insensitive' } },
        {
          category: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const products = await this.prisma.shopProduct.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
      include: productInclude,
    });

    return {
      products: products.map((product) => this.toProductResponse(product)),
      nextCursor:
        products.length === limit ? products[products.length - 1].id : null,
    };
  }

  async findOne(id: string, tenant: TenantContext) {
    const product = await this.prisma.shopProduct.findFirst({
      where: { id, tenantId: tenant.id, active: true },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('SHOP_PRODUCT_NOT_FOUND');
    }

    return this.toProductResponse(product);
  }

  async createProduct(
    dto: CreateShopProductDto,
    user: { userId: string },
    tenant: TenantContext,
  ) {
    const imageUrls = dto.imageUrls.map((url) => url.trim()).filter(Boolean);
    if (imageUrls.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    const category = dto.categoryId
      ? await this.prisma.shopCategory.findFirst({
          where: { id: dto.categoryId, tenantId: tenant.id, active: true },
        })
      : await this.findOrCreateCategory(dto.category, tenant.id);

    if (!category) {
      throw new NotFoundException('SHOP_CATEGORY_NOT_FOUND');
    }

    const product = await this.prisma.shopProduct.create({
      data: {
        tenantId: tenant.id,
        createdBy: user.userId,
        categoryId: category.id,
        name: dto.name.trim(),
        price: dto.price.trim(),
        origin: dto.origin?.trim() || null,
        description: dto.description.trim(),
        imageUrl: imageUrls[0],
        isOcop: dto.isOcop ?? true,
        sortOrder: dto.sortOrder ?? 0,
        images: {
          create: imageUrls.map((imageUrl, index) => ({
            imageUrl,
            sortOrder: index,
          })),
        },
      },
      include: productInclude,
    });

    return this.toProductResponse(product);
  }

  private async findOrCreateCategory(name: string, tenantId: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Category is required');
    }

    const existing = await this.prisma.shopCategory.findFirst({
      where: { tenantId, name: trimmedName },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.shopCategory.create({
      data: {
        tenantId,
        name: trimmedName,
      },
    });
  }

  private toProductResponse(
    product: Prisma.ShopProductGetPayload<{ include: typeof productInclude }>,
  ) {
    const normalized = normalizeMediaUrls(product);
    const imageUrl =
      normalized.imageUrl ?? normalized.images[0]?.imageUrl ?? '';

    return {
      id: normalized.id,
      name: normalized.name,
      price: normalized.price,
      origin: normalized.origin ?? '',
      rating: normalized.rating.toString(),
      imageUrl,
      category: normalized.category.name,
      categoryId: normalized.categoryId,
      description: normalized.description,
      isOcop: normalized.isOcop,
      images: normalized.images,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
