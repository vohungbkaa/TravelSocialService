import { Controller, Get, Param } from '@nestjs/common';
import { AreasService } from './areas.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Public Areas')
@Public()
@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @ApiOperation({ summary: 'List all published areas' })
  async findAll() {
    const data = await this.areasService.findAllPublic();
    return { data };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get details of a published area by slug' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async findOne(@Param('slug') slug: string) {
    const data = await this.areasService.findOnePublic(slug);
    return { data };
  }

  @Get(':slug/places')
  @ApiOperation({ summary: 'List published places in an area by area slug' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async findPlaces(@Param('slug') slug: string) {
    const data = await this.areasService.findPlacesPublic(slug);
    return { data };
  }
}
