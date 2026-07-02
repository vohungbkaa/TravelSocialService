import { Controller, Get, Param } from '@nestjs/common';
import { AreasService } from './areas.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';

@ApiTags('Public Areas')
@Public()
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'List all published areas' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    const data = await this.areasService.findAllPublic(tenant);
    return { data };
  }

  @Get(':slug/map-config')
  @ApiOperation({ summary: 'Get public map config and enabled GeoJSON layers for an area' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async mapConfig(@Param('slug') slug: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.areasService.getMapConfig(slug, tenant);
    return { data };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get details of a published area by slug' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async findOne(@Param('slug') slug: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.areasService.findOnePublic(slug, tenant);
    return { data };
  }

  @Get(':slug/places')
  @ApiOperation({ summary: 'List published places in an area by area slug' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async findPlaces(@Param('slug') slug: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.areasService.findPlacesPublic(slug, tenant);
    return { data };
  }
}
