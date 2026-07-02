import { Module } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';
import { AdminAreasController } from './admin-areas.controller';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [AreasController, AdminAreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
