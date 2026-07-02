import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from './tenant-context.type';
import { TenantsService } from './tenants.service';

@ApiTags('Tenant')
@Public()
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get public tenant config for the current host' })
  async config(@CurrentTenant() tenant: TenantContext) {
    const data = await this.tenantsService.getPublicConfig(tenant);
    return { data };
  }
}
