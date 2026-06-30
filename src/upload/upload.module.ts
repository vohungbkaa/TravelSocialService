import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, LocalStorageProvider, R2StorageProvider],
  exports: [UploadService],
})
export class UploadModule {}
