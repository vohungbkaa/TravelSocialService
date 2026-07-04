import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenants/tenant-context.type';

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
}
