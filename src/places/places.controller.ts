import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import { ListPlacesQueryDto } from './dto/list-places-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Public Places')
@Public()
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'List and search published places' })
  async findAll(@Query() query: ListPlacesQueryDto) {
    const data = await this.placesService.findAllPublic(query);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a published place by ID' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async findOne(@Param('id') id: string) {
    const data = await this.placesService.findOnePublic(id);
    return { data };
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get details of a published place by slug' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async findOneBySlug(@Param('slug') slug: string) {
    const data = await this.placesService.findOnePublicBySlug(slug);
    return { data };
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'Get sorted images for a published place' })
  @ApiResponse({ status: 404, description: 'Place not found' })
  async findImages(@Param('id') id: string) {
    const data = await this.placesService.findImagesPublic(id);
    return { data };
  }
}
