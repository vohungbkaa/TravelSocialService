import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateShopProductDto {
  @ApiProperty({ example: 'Mô hình dưa lưới' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Giá liên hệ' })
  @IsString()
  price: string;

  @ApiProperty({ required: false, example: 'Xã Tiến Thắng, Mê Linh' })
  @IsString()
  @IsOptional()
  origin?: string;

  @ApiProperty({ example: 'Trái cây' })
  @IsString()
  category: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'Dưa lưới công nghệ cao, sạch, ngọt mát...' })
  @IsString()
  description: string;

  @ApiProperty({
    type: [String],
    description:
      'Upload images through POST /api/v1/upload first, then pass returned URLs here.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageUrls: string[];

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isOcop?: boolean;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  @IsOptional()
  sortOrder?: number;
}
