import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '+84901234567', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{8,15}$/, {
    message: 'Phone must contain between 8 and 15 digits',
  })
  phone?: string;

  @ApiProperty({ example: 'localtraveler' })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @Length(3, 30, { message: 'Username must be between 3 and 30 characters' })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username must contain only lowercase letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 100, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'Local Traveler' })
  @IsString()
  @IsNotEmpty({ message: 'Display name is required' })
  @Length(1, 80, {
    message: 'Display name must be between 1 and 80 characters',
  })
  displayName: string;
}
