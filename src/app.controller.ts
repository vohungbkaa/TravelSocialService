import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

export class TestDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('test-validation')
  testValidation(@Body() body: TestDto) {
    return { success: true, data: body };
  }
}
