import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { TenantContext } from './tenant-context.type';
import { getOriginHost, normalizeTenantHost } from './tenant-resolver.util';
import { Request } from 'express';

const DEFAULT_TENANT_CODE = 'tien-thang';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolveFromRequest(request: Request & { user?: { role?: string } }): Promise<TenantContext | undefined> {
    const headers = request.headers;
    
    // Attempt to extract role from auth token if not already parsed
    let role = request.user?.role;
    if (!role && headers.authorization?.startsWith('Bearer ')) {
      try {
        const token = headers.authorization.split(' ')[1];
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        role = payload.role;
      } catch (e) {}
    }

    const codeOverride = this.getCodeOverride(headers['x-tenant-code'], role) || this.getCodeOverride(request.query?.tenant, role);
    if (codeOverride) {
      return this.findEnabledTenantByCode(codeOverride);
    }

    const host =
      normalizeTenantHost(headers['x-tenant-host']) ||
      getOriginHost(headers) ||
      normalizeTenantHost(headers.host);

    if (host) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { domain: host },
      });
      if (tenant) {
        if (!tenant.enabled) {
          throw new ForbiddenException('TENANT_DISABLED');
        }
        return tenant;
      }
    }

    const fallbackCode =
      this.configService.get<string>('app.tenant.defaultCode') || DEFAULT_TENANT_CODE;
    return this.findEnabledTenantByCode(fallbackCode, false);
  }

  async requireTenant(tenant?: TenantContext): Promise<TenantContext> {
    if (tenant) {
      return tenant;
    }

    const fallbackCode =
      this.configService.get<string>('app.tenant.defaultCode') || DEFAULT_TENANT_CODE;
    const resolved = await this.findEnabledTenantByCode(fallbackCode, false);
    if (!resolved) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
    return resolved;
  }

  async getPublicConfig(tenant?: TenantContext) {
    const currentTenant = await this.requireTenant(tenant);
    const features = await this.prisma.tenantFeature.findMany({
      where: { tenantId: currentTenant.id },
      orderBy: { feature: 'asc' },
    });
    const defaultArea = await this.prisma.area.findFirst({
      where: { tenantId: currentTenant.id, published: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      code: currentTenant.code,
      name: currentTenant.name,
      domain: currentTenant.domain,
      theme: currentTenant.theme,
      features: features.reduce<Record<string, boolean>>((acc, feature) => {
        acc[feature.feature] = feature.enabled;
        return acc;
      }, {}),
      map: {
        defaultAreaSlug: defaultArea?.slug,
        center: defaultArea
          ? [Number(defaultArea.centerLng), Number(defaultArea.centerLat)]
          : undefined,
        zoom: 13,
        minZoom: 10,
        maxZoom: 18,
      },
    };
  }

  async findAllForAdmin() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { areas: true, places: true, users: true }
        }
      }
    });
  }

  async canAdminAccessTenant(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
    return Boolean(membership?.active);
  }

  private getCodeOverride(value?: unknown, userRole?: string): string | undefined {
    const enabled =
      this.configService.get<string>('app.nodeEnv') !== 'production' ||
      this.configService.get<boolean>('app.tenant.enableCodeOverride') === true ||
      userRole === 'SUPER_ADMIN';

    if (!enabled) {
      return undefined;
    }

    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') {
      return undefined;
    }
    return raw?.trim().toLowerCase() || undefined;
  }

  private async findEnabledTenantByCode(
    code: string,
    throwIfMissing = true,
  ): Promise<TenantContext | undefined> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code },
    });
    if (!tenant) {
      if (throwIfMissing) {
        throw new NotFoundException('TENANT_NOT_FOUND');
      }
      return undefined;
    }
    if (!tenant.enabled) {
      throw new ForbiddenException('TENANT_DISABLED');
    }
    return tenant;
  }
}
