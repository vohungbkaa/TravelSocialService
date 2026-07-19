import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  Prisma,
  SocialAuthProvider,
  TenantUser,
  UserProfile,
  UserStatus,
  UserRole,
} from '@prisma/client';
import { GoogleTokenVerifier } from './google-token-verifier.service';
import { FacebookTokenVerifier } from './facebook-token-verifier.service';
import { SocialAuthProfile } from './social-auth-profile';

const authUserInclude = {
  profile: true,
  tenants: true,
} satisfies Prisma.UserInclude;

type AuthUser = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly googleTokenVerifier: GoogleTokenVerifier,
    private readonly facebookTokenVerifier: FacebookTokenVerifier,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const username = dto.username.toLowerCase();
    const phone = dto.phone ? this.normalizePhone(dto.phone) : undefined;

    // Check duplicate email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    // Check duplicate username
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('USERNAME_ALREADY_EXISTS');
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        throw new ConflictException('PHONE_ALREADY_EXISTS');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create User & Profile in Transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          phone,
          username,
          passwordHash,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          displayName: dto.displayName,
        },
      });

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      username: user.username,
      displayName: dto.displayName,
      role: user.role,
      status: user.status,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const phone = this.looksLikePhone(identifier)
      ? this.normalizePhone(identifier)
      : identifier;

    // Find User by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }, { phone }],
      },
      include: authUserInclude,
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    this.assertUserCanLogin(user);

    // Verify Password
    if (!user.passwordHash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.createAuthSession(user);
  }

  async loginWithGoogle(idToken: string) {
    const profile = await this.googleTokenVerifier.verify(idToken);
    return this.loginWithSocialProfile(SocialAuthProvider.GOOGLE, profile);
  }

  async loginWithFacebook(accessToken: string) {
    const profile = await this.facebookTokenVerifier.verify(accessToken);
    return this.loginWithSocialProfile(SocialAuthProvider.FACEBOOK, profile);
  }

  async refresh(dto: RefreshTokenDto) {
    const hashedToken = this.hashToken(dto.refreshToken);

    // Find token in database
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashedToken },
      include: {
        user: {
          include: {
            profile: true,
            tenants: true,
          },
        },
      },
    });

    if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    const user = dbToken.user;
    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('USER_SUSPENDED');
    }

    // Rotate Refresh Token in Transaction
    const { accessToken, newRefreshToken } = await this.prisma.$transaction(
      async (tx) => {
        // Revoke current token
        await tx.refreshToken.update({
          where: { id: dbToken.id },
          data: { revokedAt: new Date() },
        });

        // Create new refresh token
        const rawToken = crypto.randomUUID();
        const newHash = this.hashToken(rawToken);
        const refreshTtl =
          this.configService.get<string>('app.jwt.refreshTtl') || '30d';
        const expiresAt = this.getExpiryDate(refreshTtl);

        await tx.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: newHash,
            expiresAt,
          },
        });

        const access = this.generateAccessToken(
          user.id,
          user.username,
          user.role,
          user.tenants,
          user.profile,
        );
        return { accessToken: access, newRefreshToken: rawToken };
      },
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(dto: LogoutDto) {
    const hashedToken = this.hashToken(dto.refreshToken);

    // Find and revoke active token
    const dbToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashedToken },
    });

    if (dbToken && !dbToken.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  // --- Helper Methods ---

  private async loginWithSocialProfile(
    provider: SocialAuthProvider,
    profile: SocialAuthProfile,
  ) {
    const identity = await this.prisma.socialAuthIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    });

    if (identity) {
      this.assertUserCanLogin(identity.user);
      return this.createAuthSession(identity.user);
    }

    const email = profile.email?.trim().toLowerCase();
    const existingUser = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;
    if (existingUser) {
      this.assertUserCanLogin(existingUser);
    }

    const userId = await this.prisma.$transaction(async (tx) => {
      if (existingUser) {
        await tx.socialAuthIdentity.create({
          data: {
            userId: existingUser.id,
            provider,
            providerUserId: profile.providerUserId,
          },
        });
        return existingUser.id;
      }

      const username = await this.createSocialUsername(
        tx,
        provider,
        profile.providerUserId,
      );
      const user = await tx.user.create({
        data: {
          email,
          username,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
          profile: {
            create: {
              displayName: profile.displayName,
              avatarMediaId: profile.avatarUrl,
            },
          },
          socialAuthIdentities: {
            create: {
              provider,
              providerUserId: profile.providerUserId,
            },
          },
        },
      });
      return user.id;
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: authUserInclude,
    });
    this.assertUserCanLogin(user);
    return this.createAuthSession(user);
  }

  private async createSocialUsername(
    tx: Prisma.TransactionClient,
    provider: SocialAuthProvider,
    providerUserId: string,
  ): Promise<string> {
    const providerName = provider.toLowerCase();
    const digest = crypto
      .createHash('sha256')
      .update(providerUserId)
      .digest('hex');

    for (let length = 12; length <= digest.length; length += 4) {
      const username = `${providerName}_${digest.slice(0, length)}`;
      const existing = await tx.user.findUnique({ where: { username } });
      if (!existing) {
        return username;
      }
    }

    return `${providerName}_${crypto.randomUUID().replaceAll('-', '')}`;
  }

  private assertUserCanLogin(user: Pick<AuthUser, 'status'>): void {
    if (user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('USER_SUSPENDED');
    }
  }

  private async createAuthSession(user: AuthUser) {
    const accessToken = this.generateAccessToken(
      user.id,
      user.username,
      user.role,
      user.tenants,
      user.profile,
    );
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        role: user.role,
      },
    };
  }

  private looksLikePhone(identifier: string): boolean {
    return /^\+?[0-9\s().-]+$/.test(identifier);
  }

  private normalizePhone(phone: string): string {
    const trimmed = phone.trim();
    const prefix = trimmed.startsWith('+') ? '+' : '';
    return prefix + trimmed.replace(/\D/g, '');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(
    userId: string,
    username: string,
    role: UserRole,
    tenants: Array<Pick<TenantUser, 'tenantId' | 'role'>> = [],
    profile: Pick<UserProfile, 'displayName' | 'avatarMediaId'> | null = null,
  ): string {
    const tenantRoles = tenants.map((t) => ({
      tenantId: t.tenantId,
      role: t.role,
    }));
    const displayName = profile?.displayName || username;
    const avatar = profile?.avatarMediaId || null;
    const payload = {
      sub: userId,
      username,
      role,
      tenantRoles,
      displayName,
      avatar,
    };
    return this.jwtService.sign(payload);
  }

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomUUID();
    const hashedToken = this.hashToken(rawToken);
    const refreshTtl =
      this.configService.get<string>('app.jwt.refreshTtl') || '30d';
    const expiresAt = this.getExpiryDate(refreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashedToken,
        expiresAt,
      },
    });

    return rawToken;
  }

  private getExpiryDate(ttl: string): Date {
    const value = parseInt(ttl.slice(0, -1), 10);
    const unit = ttl.slice(-1);
    const now = new Date();

    if (unit === 'd') {
      now.setDate(now.getDate() + value);
    } else if (unit === 'h') {
      now.setHours(now.getHours() + value);
    } else if (unit === 'm') {
      now.setMinutes(now.getMinutes() + value);
    } else {
      now.setDate(now.getDate() + 30);
    }

    return now;
  }
}
