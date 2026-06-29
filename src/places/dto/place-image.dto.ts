import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlaceImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsNotEmpty({ message: 'imageUrl is required' })
  imageUrl: string;

  @ApiProperty({ example: 'View of the sunset', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 300, { message: 'Caption cannot exceed 300 characters' })
  caption?: string;

  @ApiProperty({ example: 0, default: 0, required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePlaceImageDto {
  @ApiProperty({ example: 'Updated view', required: false })
  @IsString()
  @IsOptional()
  @Length(0, 300, { message: 'Caption cannot exceed 300 characters' })
  caption?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
