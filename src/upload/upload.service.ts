import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage-provider.interface';
import { LocalStorageProvider } from './local-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';

@Injectable()
export class UploadService {
  private provider: StorageProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly r2Provider: R2StorageProvider,
  ) {
    const providerName = this.configService.get<string>('app.storage.provider') || 'local';
    if (providerName === 'r2') {
      this.provider = this.r2Provider;
    } else {
      this.provider = this.localProvider;
    }
  }

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('FILE_IS_REQUIRED');
    }
    return this.provider.uploadFile(file, folder);
  }
}
