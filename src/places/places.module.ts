import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { AdminPlacesController } from './admin-places.controller';
import { PlaceCategoriesController } from './place-categories.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PlacesController, AdminPlacesController, PlaceCategoriesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
