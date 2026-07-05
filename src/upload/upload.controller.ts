import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image, video, or document file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size exceeded',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allowedFileTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
    ];

    const isImage = allowedImageTypes.includes(file.mimetype);
    const isVideo = allowedVideoTypes.includes(file.mimetype);
    const isDocument = allowedFileTypes.includes(file.mimetype);

    if (!isImage && !isVideo && !isDocument) {
      throw new BadRequestException(
        'Only images, videos, and common document files are allowed',
      );
    }

    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxFileSize = 25 * 1024 * 1024; // 25MB

    if (isImage && file.size > maxImageSize) {
      throw new BadRequestException('Image size cannot exceed 10MB');
    }

    if (isVideo && file.size > maxVideoSize) {
      throw new BadRequestException('Video size cannot exceed 100MB');
    }

    if (isDocument && file.size > maxFileSize) {
      throw new BadRequestException('File size cannot exceed 25MB');
    }

    const folder = isImage ? 'images' : isVideo ? 'videos' : 'files';
    const result = await this.uploadService.uploadFile(file, folder);

    return {
      success: true,
      data: {
        ...result,
        type: isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE',
        title: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    };
  }
}
