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
        reactions: true,
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
        reactions: true,
      },
    });
  }

  async update(
    id: string,
    dto: CreateNewsDto,
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
        'You do not have permission to edit this post',
      );
    }

    const isAuthor = post.authorId === user.userId;
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

    let isTenantAdmin = false;
    if (!isAuthor && !isAdmin) {
      const tenantUser = await this.prisma.tenantUser.findFirst({
        where: {
          tenantId: tenant.id,
          userId: user.userId,
          role: { in: ['ADMIN', 'OWNER'] },
        },
      });
      isTenantAdmin = !!tenantUser;
    }

    if (!isAuthor && !isAdmin && !isTenantAdmin) {
      throw new ForbiddenException(
        'You do not have permission to edit this post',
      );
    }

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

    await this.prisma.$transaction([
      this.prisma.postImage.deleteMany({ where: { postId: id } }),
      this.prisma.postAttachment.deleteMany({ where: { postId: id } }),
      this.prisma.post.update({
        where: { id },
        data: {
          content: dto.content?.trim() ?? '',
          category: dto.category,
          images: {
            create: [...imagesData, ...attachmentImagesData],
          },
          attachments: {
            create: attachmentsData,
          },
        },
      }),
    ]);

    return this.prisma.post.findUnique({
      where: { id },
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
        reactions: true,
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

  async getComments(postId: string, tenant: TenantContext) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.tenantId !== tenant.id) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.postComment.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: true,
          },
        },
        likes: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(
    postId: string,
    dto: { content: string; mediaUrl?: string; mediaType?: string },
    user: { userId: string },
    tenant: TenantContext,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.tenantId !== tenant.id) {
      throw new NotFoundException('Post not found');
    }

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: user.userId,
        content: dto.content ?? '',
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
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
        likes: true,
      },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  }

  async togglePostReaction(
    postId: string,
    type: string,
    user: { userId: string },
    tenant: TenantContext,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post || post.tenantId !== tenant.id) {
      throw new NotFoundException('Post not found');
    }

    const existingReaction = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.userId,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        await this.prisma.postReaction.delete({
          where: {
            postId_userId: {
              postId,
              userId: user.userId,
            },
          },
        });
        const updatedPost = await this.prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        });
        return { reacted: false, count: updatedPost.likesCount };
      } else {
        await this.prisma.postReaction.update({
          where: {
            postId_userId: {
              postId,
              userId: user.userId,
            },
          },
          data: { type },
        });
        return { reacted: true, type, count: post.likesCount };
      }
    } else {
      await this.prisma.postReaction.create({
        data: {
          postId,
          userId: user.userId,
          type,
        },
      });
      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
      return { reacted: true, type, count: updatedPost.likesCount };
    }
  }

  async toggleCommentLike(
    commentId: string,
    user: { userId: string },
    tenant: TenantContext,
  ) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment || comment.post.tenantId !== tenant.id) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.userId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId: user.userId,
          },
        },
      });
      const likesCount = await this.prisma.commentLike.count({
        where: { commentId },
      });
      return { liked: false, count: likesCount };
    } else {
      await this.prisma.commentLike.create({
        data: {
          commentId,
          userId: user.userId,
        },
      });
      const likesCount = await this.prisma.commentLike.count({
        where: { commentId },
      });
      return { liked: true, count: likesCount };
    }
  }
}
