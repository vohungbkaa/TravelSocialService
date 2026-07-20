import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ description: 'Token issued by the social provider' })
  @IsString()
  @IsNotEmpty({ message: 'Social login token is required' })
  token: string;

  @ApiPropertyOptional({
    description: 'Nonce returned with a Facebook Limited Login token',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  nonce?: string;
}
