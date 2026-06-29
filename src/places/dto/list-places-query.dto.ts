import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PriceLevel } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ListPlacesQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  areaSlug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  areaId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string; // category code

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  provinceCode?: string;

  @ApiProperty({ enum: PriceLevel, required: false })
  @IsEnum(PriceLevel)
  @IsOptional()
  priceLevel?: PriceLevel;

  @ApiProperty({ required: false, default: 20 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiProperty({ required: false, enum: ['newest', 'rating'] })
  @IsString()
  @IsOptional()
  sort?: 'newest' | 'rating';
}
