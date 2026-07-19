import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMyProfileDto {
  @ApiProperty({ required: false, maxLength: 120 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;
}
