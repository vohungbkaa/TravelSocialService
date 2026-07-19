import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';
import { CreateShopCategoryDto } from './dto/create-shop-category.dto';
import { CreateShopProductDto } from './dto/create-shop-product.dto';
import { ListShopProductsQueryDto } from './dto/list-shop-products-query.dto';
import { ShopService } from './shop.service';

@ApiTags('Shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('categories')
  @Public()
  @ApiOperation({
    summary: 'List active shop categories for the current tenant',
  })
  async listCategories(@CurrentTenant() tenant: TenantContext) {
    const data = await this.shopService.listCategories(tenant);
    return { data };
  }

  @Post('categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a shop category for the current tenant' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  async createCategory(
    @Body() dto: CreateShopCategoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.shopService.createCategory(dto, tenant);
    return { data };
  }

  @Get('products')
  @Public()
  @ApiOperation({
    summary: 'List, search, and filter shop products by category',
  })
  async listProducts(
    @Query() query: ListShopProductsQueryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.shopService.listProducts(query, tenant);
    return { data };
  }

  @Get('products/:id')
  @Public()
  @ApiOperation({ summary: 'Get shop product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.shopService.findOne(id, tenant);
    return { data };
  }

  @Post('products')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create an agricultural product with uploaded image URLs',
  })
  async createProduct(
    @Body() dto: CreateShopProductDto,
    @CurrentUser() user: { userId: string },
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.shopService.createProduct(dto, user, tenant);
    return { data };
  }

  @Put('products/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a shop product' })
  async update(
    @Param('id') id: string,
    @Body() dto: CreateShopProductDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.shopService.updateProduct(id, dto, user, tenant);
    return { data };
  }

  @Delete('products/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a shop product' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.shopService.deleteProduct(id, user, tenant);
    return { success: true };
  }
}
