import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsJSON,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PriceLevel } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlaceDto {
  @ApiProperty({ example: 'Hoan Kiem Lake' })
  @IsString()
  @Length(1, 150, { message: 'Name must be between 1 and 150 characters' })
  name: string;

  @ApiProperty({ example: 'A legendary lake in the center of Hanoi', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Summary cannot exceed 500 characters' })
  summary?: string;

  @ApiProperty({ example: 'Detailed description of the lake...', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 10000, { message: 'Description cannot exceed 10000 characters' })
  description?: string;

  @ApiProperty({ example: 'Visit early in the morning to see locals doing Tai Chi', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: 'Local tip cannot exceed 1000 characters' })
  localTip?: string;

  @ApiProperty({ example: 'Autumn or early morning', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Best time cannot exceed 500 characters' })
  bestTime?: string;

  @ApiProperty({ example: 'Free', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 100, { message: 'Price range cannot exceed 100 characters' })
  priceRange?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ example: 1, required: false, description: 'Optional marker icon override for this place' })
  @IsInt()
  @IsOptional()
  markerIconId?: number | null;

  @ApiProperty({ example: 'area-uuid-here', required: false })
  @IsString()
  @IsOptional()
  areaId?: string;

  @ApiProperty({ example: 'Hang Trong, Hoan Kiem, Hanoi', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 500, { message: 'Address cannot exceed 500 characters' })
  address?: string;

  @ApiProperty({ example: '01', required: false })
  @IsString()
  @IsOptional()
  provinceCode?: string;

  @ApiProperty({ example: '001', required: false })
  @IsString()
  @IsOptional()
  districtCode?: string;

  @ApiProperty({ example: '00001', required: false })
  @IsString()
  @IsOptional()
  wardCode?: string;

  @ApiProperty({ example: 21.0285, required: false })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ example: 105.8542, required: false })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({ enum: PriceLevel, required: false })
  @IsEnum(PriceLevel)
  @IsOptional()
  priceLevel?: PriceLevel;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  estimatedMinCost?: number;

  @ApiProperty({ example: 0, required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  estimatedMaxCost?: number;

  @ApiProperty({ example: 60, required: false })
  @IsInt()
  @IsOptional()
  @Min(15)
  @Max(1440)
  averageVisitDurationMinutes?: number;

  @ApiProperty({ example: { monday: '00:00-24:00' }, required: false })
  @IsOptional()
  openingHours?: any;

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ example: 'https://youtube.com/watch?v=123', required: false })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 'https://example.com/audio.mp3', required: false })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiProperty({ example: 0, default: 0, required: false })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
