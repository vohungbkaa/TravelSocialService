import { Controller, Get } from '@nestjs/common';
import { PlacesService } from './places.service';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Categories')
@Public()
@Controller('place-categories')
export class PlaceCategoriesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'List all place categories' })
  async findAll() {
    const data = await this.placesService.listCategories();
    return { data };
  }
}
