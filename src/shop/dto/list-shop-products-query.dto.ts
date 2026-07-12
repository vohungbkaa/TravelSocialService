import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListShopProductsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Search by name, category, origin, or description.',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ required: false, description: 'Filter by category name.' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, description: 'Filter by category id.' })
  @IsString()
  @IsOptional()
  categoryId?: string;

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
}
