import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PlacesService } from './places.service';

@ApiTags('Marker Icons')
@Controller('marker-icons')
export class MarkerIconsController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active marker icons' })
  async findAll() {
    const data = await this.placesService.listMarkerIcons();
    return { data };
  }

  @Post()
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a marker icon' })
  @ApiResponse({ status: 201, description: 'Marker icon successfully created' })
  async create(
    @Body()
    dto: {
      key: string;
      name: string;
      iconUrl: string;
      markerColor: string;
      active?: boolean;
    },
  ) {
    const data = await this.placesService.createMarkerIcon(dto);
    return { data };
  }
}
