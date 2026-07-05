import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NewsAttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE',
  LINK = 'LINK',
}

export class CreateNewsAttachmentDto {
  @ApiProperty({ enum: NewsAttachmentType, example: NewsAttachmentType.IMAGE })
  @IsEnum(NewsAttachmentType)
  type: NewsAttachmentType;

  @ApiProperty({ example: 'https://example.com/media/image1.jpg' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: 'Lễ hội mùa xuân' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ example: 204800 })
  @IsInt()
  @Min(0)
  @IsOptional()
  size?: number;
}

export class CreateNewsDto {
  @ApiProperty({ example: 'Khám phá Hà Giang mùa hoa tam giác mạch...' })
  @IsString()
  @IsOptional()
  content: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ example: ['https://example.com/bai-viet'] })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  linkUrls?: string[];

  @ApiPropertyOptional({ type: [CreateNewsAttachmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNewsAttachmentDto)
  @IsOptional()
  attachments?: CreateNewsAttachmentDto[];

  @ApiPropertyOptional({ example: 'Du lịch' })
  @IsString()
  @IsOptional()
  category?: string;
}
