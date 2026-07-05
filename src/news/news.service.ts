import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenants/tenant-context.type';
import { CreateNewsDto } from './dto/create-news.dto';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenant: TenantContext) {
    return this.prisma.post.findMany({
      where: { tenantId: tenant.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateNewsDto, user: { userId: string }, tenant: TenantContext) {
    const imagesData = dto.imageUrls?.map((url, index) => ({
      imageUrl: url,
      sortOrder: index,
    })) || [];

    return this.prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorId: user.userId,
        content: dto.content,
        category: dto.category,
        images: {
          create: imagesData,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async remove(id: string, user: { userId: string; role?: string }, tenant: TenantContext) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.tenantId !== tenant.id) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    // System Admins and the original author are always allowed to delete
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || post.authorId === user.userId) {
      await this.prisma.post.delete({ where: { id } });
      return;
    }

    // Otherwise, check if user is a Tenant Admin/Owner for this tenant
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.userId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
    });

    if (!tenantUser) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    await this.prisma.post.delete({ where: { id } });
  }
}
