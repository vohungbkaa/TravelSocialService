import { Module } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreasController } from './areas.controller';
import { AdminAreasController } from './admin-areas.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AreasController, AdminAreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
