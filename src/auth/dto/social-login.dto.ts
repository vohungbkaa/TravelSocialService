import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({ description: 'Token issued by the social provider' })
  @IsString()
  @IsNotEmpty({ message: 'Social login token is required' })
  token: string;
}
