import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [ConfigModule, HealthModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

