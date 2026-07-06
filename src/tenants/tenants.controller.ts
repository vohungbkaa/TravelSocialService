import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from './tenant-context.type';
import { TenantsService } from './tenants.service';

@ApiTags('Tenant')
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Get public tenant config for the current host' })
  async config(@CurrentTenant() tenant: TenantContext) {
    const data = await this.tenantsService.getPublicConfig(tenant);
    return { data };
  }

  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of active users in the current tenant' })
  async getTenantUsers(@CurrentTenant() tenant: TenantContext) {
    const data = await this.tenantsService.getTenantUsers(tenant);
    return { data };
  }

  @Get('admin/list')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenants (SUPER_ADMIN only)' })
  async listAllAdmin() {
    const data = await this.tenantsService.findAllForAdmin();
    return { data };
  }
}
