import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { PlacesService } from './places.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

@ApiTags('Place Categories')
@Controller('place-categories')
export class PlaceCategoriesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active place categories (public)' })
  async findAll() {
    const data = await this.placesService.listCategories();
    return { data };
  }

  @Get('admin')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all place categories including inactive ones (admin)' })
  async findAllAdmin() {
    const data = await this.placesService.listCategoriesAdmin();
    return { data };
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new category (admin)' })
  @ApiResponse({ status: 201, description: 'Category successfully created' })
  @ApiResponse({ status: 409, description: 'Category code already exists' })
  async create(@Body() dto: { code?: string; name: string; description?: string }) {
    const data = await this.placesService.createCategory(dto);
    return { data };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle category active/inactive status (admin)' })
  @ApiResponse({ status: 200, description: 'Category status successfully updated' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { active: boolean }
  ) {
    const data = await this.placesService.updateCategory(id, dto.active);
    return { data };
  }
}
