import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin Areas')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/areas')
export class AdminAreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new area' })
  @ApiResponse({ status: 201, description: 'Area successfully created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(@Body() createAreaDto: CreateAreaDto) {
    const data = await this.areasService.create(createAreaDto);
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'List all areas' })
  async findAll() {
    const data = await this.areasService.findAllAdmin();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get area details by ID' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async findOne(@Param('id') id: string) {
    const data = await this.areasService.findOneAdmin(id);
    return { data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an area' })
  @ApiResponse({ status: 200, description: 'Area successfully updated' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    const data = await this.areasService.update(id, updateAreaDto);
    return { data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an area' })
  @ApiResponse({ status: 200, description: 'Area successfully deleted' })
  @ApiResponse({ status: 400, description: 'Area has places attached' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async remove(@Param('id') id: string) {
    await this.areasService.remove(id);
    return { success: true };
  }
}
