import { Controller, Get, Delete, Param, Post, Body, Patch } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public News/Posts')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all news posts for the current tenant' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    const data = await this.newsService.findAll(tenant);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new news post' })
  async create(
    @Body() dto: CreateNewsDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.create(dto, user, tenant);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a news post' })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateNewsDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.update(id, dto, user, tenant);
    return { data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a news post' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.newsService.remove(id, user, tenant);
    return { success: true };
  }

  @Get(':id/comments')
  @Public()
  @ApiOperation({ summary: 'Get comments of a news post' })
  async getComments(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.getComments(id, tenant);
    return { data };
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Create a comment on a news post' })
  async createComment(
    @Param('id') id: string,
    @Body() dto: { content: string; mediaUrl?: string; mediaType?: string },
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.createComment(id, dto, user, tenant);
    return { data };
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Toggle post reaction' })
  async togglePostReaction(
    @Param('id') id: string,
    @Body() dto: { type: string },
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.togglePostReaction(id, dto.type, user, tenant);
    return { data };
  }

  @Post('comments/:commentId/like')
  @ApiOperation({ summary: 'Toggle comment like' })
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.toggleCommentLike(commentId, user, tenant);
    return { data };
  }
}
