import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNewsDto {
  @ApiProperty({ example: 'Khám phá Hà Giang mùa hoa tam giác mạch...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: ['https://example.com/image1.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ example: 'Du lịch' })
  @IsString()
  @IsOptional()
  category?: string;
}
