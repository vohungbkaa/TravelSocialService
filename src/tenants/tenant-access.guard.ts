import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TenantsService } from './tenants.service';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly tenantsService: TenantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.path || '';
    const isAdminRoute = String(path).startsWith('/admin') || request.originalUrl?.startsWith('/api/v1/admin');

    if (!isAdminRoute) {
      return true;
    }

    const user = request.user;
    if (!user || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (user.role !== UserRole.ADMIN) {
      return true;
    }

    const tenant = await this.tenantsService.requireTenant(request.tenant);
    const allowed = await this.tenantsService.canAdminAccessTenant(user.userId, tenant.id);
    if (!allowed) {
      throw new ForbiddenException('TENANT_ADMIN_ACCESS_DENIED');
    }

    return true;
  }
}
