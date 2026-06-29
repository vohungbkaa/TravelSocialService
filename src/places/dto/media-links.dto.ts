import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMediaLinksDto {
  @ApiProperty({ example: 'https://example.com/new-cover.jpg', required: false })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ example: 'https://youtube.com/watch?v=new', required: false })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 'https://example.com/new-audio.mp3', required: false })
  @IsString()
  @IsOptional()
  audioUrl?: string;
}
