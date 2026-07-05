import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenants/tenant-context.type';
import {
  CreateNewsAttachmentDto,
  CreateNewsDto,
  NewsAttachmentType,
} from './dto/create-news.dto';

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
          orderBy: { sortOrder: 'asc' },
        },
        attachments: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    dto: CreateNewsDto,
    user: { userId: string },
    tenant: TenantContext,
  ) {
    const imageUrls = dto.imageUrls ?? [];
    const linkAttachments =
      dto.linkUrls?.map((url) => ({
        type: NewsAttachmentType.LINK,
        url,
      })) ?? [];
    const requestedAttachments = [
      ...(dto.attachments ?? []),
      ...linkAttachments,
      ...imageUrls.map((url) => ({
        type: NewsAttachmentType.IMAGE,
        url,
      })),
    ];

    if (!dto.content?.trim() && requestedAttachments.length === 0) {
      throw new BadRequestException('Post content or attachments are required');
    }

    const imagesData = imageUrls.map((url, index) => ({
      imageUrl: url,
      sortOrder: index,
    }));

    const attachmentImagesData = requestedAttachments
      .filter((attachment) => attachment.type === NewsAttachmentType.IMAGE)
      .filter((attachment) => !imageUrls.includes(attachment.url))
      .map((attachment, index) => ({
        imageUrl: attachment.url,
        sortOrder: imageUrls.length + index,
      }));

    const attachmentsData = this.buildAttachmentsData(requestedAttachments);

    return this.prisma.post.create({
      data: {
        tenantId: tenant.id,
        authorId: user.userId,
        content: dto.content?.trim() ?? '',
        category: dto.category,
        images: {
          create: [...imagesData, ...attachmentImagesData],
        },
        attachments: {
          create: attachmentsData,
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
        attachments: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  private buildAttachmentsData(attachments: CreateNewsAttachmentDto[]) {
    return attachments.map((attachment, index) => ({
      type: attachment.type,
      url: attachment.url,
      title: attachment.title,
      mimeType: attachment.mimeType,
      size: attachment.size,
      sortOrder: index,
    }));
  }

  async remove(
    id: string,
    user: { userId: string; role?: string },
    tenant: TenantContext,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.tenantId !== tenant.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    // System Admins and the original author are always allowed to delete
    if (
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      post.authorId === user.userId
    ) {
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
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }

    await this.prisma.post.delete({ where: { id } });
  }
}
