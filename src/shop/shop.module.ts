import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
