import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import type { TenantContext } from '../tenants/tenant-context.type';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(
    @Body() dto: RegisterDto,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const data = await this.authService.register(dto, tenant);
    return { data };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'User logged in, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'User suspended' })
  async login(@Body() dto: LoginDto, @CurrentTenant() tenant?: TenantContext) {
    const data = await this.authService.login(dto, tenant);
    return { data };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with a Google ID token' })
  @ApiResponse({ status: 200, description: 'User logged in, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid Google ID token' })
  async loginWithGoogle(
    @Body() dto: SocialLoginDto,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const data = await this.authService.loginWithGoogle(dto.token, tenant);
    return { data };
  }

  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with a Facebook access token' })
  @ApiResponse({ status: 200, description: 'User logged in, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid Facebook access token' })
  async loginWithFacebook(
    @Body() dto: SocialLoginDto,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const data = await this.authService.loginWithFacebook(
      dto.token,
      tenant,
      dto.nonce,
    );
    return { data };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens successfully rotated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const data = await this.authService.refresh(dto);
    return { data };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out a user and revoke their refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto);
    return { success: true };
  }
}
