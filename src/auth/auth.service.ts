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
  TenantUserRole,
  UserProfile,
  UserStatus,
  UserRole,
} from '@prisma/client';
import { GoogleTokenVerifier } from './google-token-verifier.service';
import { FacebookTokenVerifier } from './facebook-token-verifier.service';
import { SocialAuthProfile } from './social-auth-profile';
import type { TenantContext } from '../tenants/tenant-context.type';

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

  async register(dto: RegisterDto, tenant?: TenantContext) {
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
          fullName: dto.displayName,
        },
      });

      if (tenant) {
        await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            userId: newUser.id,
            role: TenantUserRole.VIEWER,
          },
        });
      }

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      username: user.username,
      fullName: dto.displayName,
      displayName: dto.displayName,
      role: user.role,
      status: user.status,
    };
  }

  async login(dto: LoginDto, tenant?: TenantContext) {
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

    const tenantUser = await this.ensureTenantMembership(user, tenant);
    return this.createAuthSession(tenantUser);
  }

  async loginWithGoogle(idToken: string, tenant?: TenantContext) {
    const profile = await this.googleTokenVerifier.verify(idToken);
    return this.loginWithSocialProfile(
      SocialAuthProvider.GOOGLE,
      profile,
      tenant,
    );
  }

  async loginWithFacebook(
    accessToken: string,
    tenant?: TenantContext,
    nonce?: string,
  ) {
    const profile = await this.facebookTokenVerifier.verify(accessToken, nonce);
    return this.loginWithSocialProfile(
      SocialAuthProvider.FACEBOOK,
      profile,
      tenant,
    );
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
          this.configService.getOrThrow<string>('JWT_REFRESH_TTL');
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
    tenant?: TenantContext,
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
      const user = await this.syncSocialUser(identity.user, provider, profile);
      const tenantUser = await this.ensureTenantMembership(user, tenant);
      return this.createAuthSession(tenantUser);
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
        email,
      );
      const user = await tx.user.create({
        data: {
          email,
          username,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
          profile: {
            create: {
              fullName: profile.fullName,
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
    const syncedUser = await this.syncSocialUser(user, provider, profile);
    const tenantUser = await this.ensureTenantMembership(syncedUser, tenant);
    return this.createAuthSession(tenantUser);
  }

  private async ensureTenantMembership(
    user: AuthUser,
    tenant?: TenantContext,
  ): Promise<AuthUser> {
    if (!tenant) return user;

    await this.prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: { active: true },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: TenantUserRole.VIEWER,
      },
    });

    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: authUserInclude,
    });
  }

  private async createSocialUsername(
    tx: Prisma.TransactionClient,
    provider: SocialAuthProvider,
    providerUserId: string,
    email?: string,
    excludeUserId?: string,
  ): Promise<string> {
    if (email) {
      const username = email.trim().toLowerCase();
      const existing = await tx.user.findUnique({ where: { username } });
      if (!existing || existing.id === excludeUserId) {
        return username;
      }
    }

    const providerName = provider.toLowerCase();
    const digest = crypto
      .createHash('sha256')
      .update(providerUserId)
      .digest('hex');

    for (let length = 12; length <= digest.length; length += 4) {
      const username = `${providerName}_${digest.slice(0, length)}`;
      const existing = await tx.user.findUnique({ where: { username } });
      if (!existing || existing.id === excludeUserId) {
        return username;
      }
    }

    return `${providerName}_${crypto.randomUUID().replaceAll('-', '')}`;
  }

  private async syncSocialUser(
    user: AuthUser,
    provider: SocialAuthProvider,
    profile: SocialAuthProfile,
  ): Promise<AuthUser> {
    return this.prisma.$transaction(async (tx) => {
      const username = await this.createSocialUsername(
        tx,
        provider,
        profile.providerUserId,
        profile.email,
        user.id,
      );

      await tx.user.update({
        where: { id: user.id },
        data: {
          username,
          profile: {
            upsert: {
              create: {
                fullName: profile.fullName,
                avatarMediaId: profile.avatarUrl,
              },
              // Social provider data is only the initial profile seed. Keep
              // the name and avatar that the user customized in the app on
              // subsequent Google/Facebook logins.
              update: {},
            },
          },
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: authUserInclude,
      });
    });
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
        fullName: user.profile?.fullName || user.username,
        displayName: user.profile?.fullName || user.username,
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
    profile: Pick<UserProfile, 'fullName' | 'avatarMediaId'> | null = null,
  ): string {
    const tenantRoles = tenants.map((t) => ({
      tenantId: t.tenantId,
      role: t.role,
    }));
    const fullName = profile?.fullName || username;
    const avatar = profile?.avatarMediaId || null;
    const payload = {
      sub: userId,
      username,
      role,
      tenantRoles,
      fullName,
      displayName: fullName,
      avatar,
    };
    return this.jwtService.sign(payload);
  }

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomUUID();
    const hashedToken = this.hashToken(rawToken);
    const refreshTtl = this.configService.getOrThrow<string>('JWT_REFRESH_TTL');
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
