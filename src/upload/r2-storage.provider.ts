import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from './storage-provider.interface';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('app.r2.accountId');
    const accessKeyId = this.configService.get<string>('app.r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('app.r2.secretAccessKey');
    this.bucket = this.configService.get<string>('app.r2.bucket') || '';
    this.publicBaseUrl = this.configService.get<string>('app.r2.publicBaseUrl') || '';
    const customEndpoint = this.configService.get<string>('app.r2.endpoint');

    const endpoint = customEndpoint || `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder = ''): Promise<{ url: string }> {
    const fileExt = path.extname(file.originalname);
    const randomName = crypto.randomUUID();
    const fileName = `${randomName}${fileExt}`;
    const key = folder ? `${folder}/${fileName}` : fileName;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      url: `${this.publicBaseUrl}/${key}`,
    };
  }
}
