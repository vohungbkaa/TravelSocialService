import {
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Body,
  Patch,
  Headers,
  Query,
} from '@nestjs/common';
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

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all news categories' })
  async getCategories(@CurrentTenant() tenant: TenantContext) {
    const data = await this.newsService.getCategories(tenant);
    return { data };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new news category' })
  async createCategory(
    @Body() dto: { name: string; description?: string; sortOrder?: number; imageUrl?: string },
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.createCategory(dto, tenant);
    return { data };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all news posts for the current tenant' })
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('category') category?: string,
  ) {
    const data = await this.newsService.findAll(tenant, category);
    return { data };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a news post detail' })
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.findOne(id, tenant);
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
    const data = await this.newsService.togglePostReaction(
      id,
      dto.type,
      user,
      tenant,
    );
    return { data };
  }

  @Post('comments/:commentId/like')
  @ApiOperation({ summary: 'Toggle comment like' })
  async toggleCommentLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.newsService.toggleCommentLike(
      commentId,
      user,
      tenant,
    );
    return { data };
  }

  @Post(':id/share')
  @Public()
  @ApiOperation({ summary: 'Share a news post' })
  async share(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    const data = await this.newsService.share(id, token, tenant);
    return { data };
  }
}
