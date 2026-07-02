import { Module } from '@nestjs/common';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { AdminPlacesController } from './admin-places.controller';
import { PlaceCategoriesController } from './place-categories.controller';
import { MarkerIconsController } from './marker-icons.controller';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [PlacesController, AdminPlacesController, PlaceCategoriesController, MarkerIconsController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
