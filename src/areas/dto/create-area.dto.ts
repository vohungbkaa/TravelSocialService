import { IsBoolean, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ example: 'Hanoi Old Quarter' })
  @IsString()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name: string;

  @ApiProperty({ example: 'hanoi-old-quarter', required: false })
  @IsString()
  @IsOptional()
  @Length(1, 120)
  slug?: string;

  @ApiProperty({ example: '01', required: false })
  @IsString()
  @IsOptional()
  provinceCode?: string;

  @ApiProperty({ example: 'The historic heart of Hanoi', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/hanoi.jpg', required: false })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ example: 21.0285 })
  @IsNumber({}, { message: 'centerLat must be a number' })
  centerLat: number;

  @ApiProperty({ example: 105.8542 })
  @IsNumber({}, { message: 'centerLng must be a number' })
  centerLng: number;

  @ApiProperty({ example: 3, default: 3, required: false })
  @IsNumber()
  @IsOptional()
  defaultRadiusKm?: number;

  @ApiProperty({ example: false, default: false, required: false })
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
