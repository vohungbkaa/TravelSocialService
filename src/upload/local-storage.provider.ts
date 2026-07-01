import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
    this.baseUrl = (this.configService.get<string>('app.storage.localBaseUrl') || '/media').replace(/\/$/, '');

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder = ''): Promise<{ url: string }> {
    const fileExt = path.extname(file.originalname);
    const randomName = crypto.randomUUID();
    const fileName = `${randomName}${fileExt}`;
    
    const targetFolder = path.join(this.uploadDir, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const filePath = path.join(targetFolder, fileName);
    await fs.promises.writeFile(filePath, file.buffer);

    const relativeUrlPath = folder ? `${folder}/${fileName}` : fileName;
    return {
      url: `${this.baseUrl}/${relativeUrlPath}`,
    };
  }
}
