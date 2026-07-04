import { Controller, Get } from '@nestjs/common';
import { NewsService } from './news.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public News/Posts')
@Public()
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @ApiOperation({ summary: 'List all news posts for the current tenant' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    const data = await this.newsService.findAll(tenant);
    return { data };
  }
}
