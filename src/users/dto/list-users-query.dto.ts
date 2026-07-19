import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ListUsersQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page = 1;

  @ApiProperty({ required: false, default: 20, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize = 20;

  @ApiProperty({
    required: false,
    description: 'Search by full name, username or email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? true : value === true || value === 'true',
  )
  includeCurrentUser = true;
}
