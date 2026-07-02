import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { CreatePlaceImageDto, UpdatePlaceImageDto } from './dto/place-image.dto';
import { UpdateMediaLinksDto } from './dto/media-links.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';

@ApiTags('Admin Places')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/places')
export class AdminPlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new place (DRAFT)' })
  @ApiResponse({ status: 201, description: 'Place successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input or costs constraints' })
  @ApiResponse({ status: 404, description: 'Category or Area not found' })
  async create(
    @Body() createPlaceDto: CreatePlaceDto,
    @CurrentUser() user: { userId: string },
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.placesService.create(createPlaceDto, user.userId, tenant);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a place' })
  @ApiResponse({ status: 200, description: 'Place successfully updated' })
  @ApiResponse({ status: 400, description: 'Invalid costs or inputs' })
  @ApiResponse({ status: 404, description: 'Place, Category, or Area not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePlaceDto: UpdatePlaceDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.placesService.update(id, updatePlaceDto, tenant);
    return { data };
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a place' })
  @ApiResponse({ status: 200, description: 'Place successfully published' })
  @ApiResponse({ status: 400, description: 'Place has incomplete fields for publishing' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async publish(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.placesService.publish(id, tenant);
    return { data };
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a place (set back to DRAFT)' })
  @ApiResponse({ status: 200, description: 'Place successfully unpublished' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async unpublish(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.placesService.unpublish(id, tenant);
    return { data };
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Add an image to a place gallery' })
  @ApiResponse({ status: 201, description: 'Image successfully added' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async addImage(
    @Param('id') id: string,
    @Body() createImageDto: CreatePlaceImageDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.placesService.addImage(id, createImageDto, tenant);
    return { data };
  }

  @Patch(':id/images/:imageId')
  @ApiOperation({ summary: 'Update place image caption/sortOrder' })
  @ApiResponse({ status: 200, description: 'Image successfully updated' })
  @ApiResponse({ status: 404, description: 'Place or image not found' })
  async updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() updateImageDto: UpdatePlaceImageDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.placesService.updateImage(id, imageId, updateImageDto, tenant);
    return { data };
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove an image from a place gallery' })
  @ApiResponse({ status: 200, description: 'Image successfully deleted' })
  @ApiResponse({ status: 404, description: 'Place or image not found' })
  async removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    await this.placesService.deleteImage(id, imageId, tenant);
    return { success: true };
  }

  @Patch(':id/media-links')
  @ApiOperation({ summary: 'Update primary media links of a place' })
  @ApiResponse({ status: 200, description: 'Media links successfully updated' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async updateMediaLinks(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaLinksDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const data = await this.placesService.updateMediaLinks(id, updateMediaDto, tenant);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'List all places (admin)' })
  @ApiResponse({ status: 200, description: 'List of all places returned' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    const data = await this.placesService.findAllAdmin(tenant);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a place (admin)' })
  @ApiResponse({ status: 200, description: 'Place details returned' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    const data = await this.placesService.findOneAdmin(id, tenant);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a place' })
  @ApiResponse({ status: 200, description: 'Place successfully deleted' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    await this.placesService.remove(id, tenant);
    return { success: true };
  }
}
