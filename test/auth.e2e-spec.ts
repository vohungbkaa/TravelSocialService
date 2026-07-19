import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { UserStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GoogleTokenVerifier } from './../src/auth/google-token-verifier.service';
import { FacebookTokenVerifier } from './../src/auth/facebook-token-verifier.service';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { assertTestDatabase } from './assert-test-database';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const googleTokenVerifier = { verify: jest.fn() };
  const facebookTokenVerifier = { verify: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleTokenVerifier)
      .useValue(googleTokenVerifier)
      .overrideProvider(FacebookTokenVerifier)
      .useValue(facebookTokenVerifier)
      .compile();

    const configService = moduleFixture.get(ConfigService);
    assertTestDatabase(configService.getOrThrow<string>('DATABASE_URL'));

    app = moduleFixture.createNestApplication();

    // Register pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(configService));
    app.setGlobalPrefix('api/v1');

    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    // Clean up database tables before each test
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "RefreshToken" CASCADE;');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      displayName: 'Test User',
    };

    it('should register a new user in the current tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.email).toBe(validUser.email);
          expect(res.body.data.username).toBe(validUser.username);
          expect(res.body.data.displayName).toBe(validUser.displayName);
          expect(res.body.data.role).toBe(UserRole.USER);
          expect(res.body.data.status).toBe(UserStatus.ACTIVE);
          expect(res.body.data).not.toHaveProperty('passwordHash');
        });

      const membership = await prisma.tenantUser.findFirst({
        where: { userId: response.body.data.id },
        include: { tenant: true },
      });
      expect(membership?.tenant.code).toBe('tien-thang');
      expect(membership?.role).toBe('VIEWER');
    });

    it('should throw ConflictException on duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser);

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          username: 'differentuser',
        })
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.error.code).toBe('CONFLICT');
          expect(res.body.error.message).toBe('EMAIL_ALREADY_EXISTS');
        });
    });

    it('should throw ConflictException on duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validUser);

      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          email: 'different@example.com',
        })
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.error.code).toBe('CONFLICT');
          expect(res.body.error.message).toBe('USERNAME_ALREADY_EXISTS');
        });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const password = 'Password123';
    let user: any;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email: 'login@example.com',
          phone: '+84901234567',
          username: 'loginuser',
          passwordHash,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
          profile: {
            create: {
              fullName: 'Login User',
            },
          },
        },
      });
    });

    it('should login successfully with email and return tokens', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'login@example.com',
          password,
        })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.user.username).toBe('loginuser');
        });
    });

    it('should login successfully with username', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'loginuser',
          password,
        })
        .expect(HttpStatus.OK);
    });

    it('should login successfully with phone', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: '+84 901 234 567',
          password,
        })
        .expect(HttpStatus.OK);
    });

    it('should fail login with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'loginuser',
          password: 'wrongpassword',
        })
        .expect(HttpStatus.UNAUTHORIZED)
        .expect((res) => {
          expect(res.body.error.code).toBe('UNAUTHORIZED');
          expect(res.body.error.message).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should fail login when user is suspended', async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.SUSPENDED },
      });

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'loginuser',
          password,
        })
        .expect(HttpStatus.FORBIDDEN)
        .expect((res) => {
          expect(res.body.error.code).toBe('FORBIDDEN');
          expect(res.body.error.message).toBe('USER_SUSPENDED');
        });
    });
  });

  describe('POST /api/v1/auth/google and /auth/facebook', () => {
    it('should create and reuse a user authenticated by Google', async () => {
      googleTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'google-user-id',
        fullName: 'Google User',
        email: 'google@example.com',
        avatarUrl: 'https://example.com/google-avatar.jpg',
      });

      const firstResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ token: 'valid-google-id-token' })
        .expect(HttpStatus.OK);
      const secondResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ token: 'valid-google-id-token' })
        .expect(HttpStatus.OK);

      expect(firstResponse.body.data).toHaveProperty('accessToken');
      expect(secondResponse.body.data.user.id).toBe(
        firstResponse.body.data.user.id,
      );
      expect(firstResponse.body.data.user.username).toBe('google@example.com');
      expect(firstResponse.body.data.user.fullName).toBe('Google User');
      expect(firstResponse.body.data.user.displayName).toBe('Google User');
      expect(await prisma.socialAuthIdentity.count()).toBe(1);
      const membership = await prisma.tenantUser.findFirst({
        where: { userId: firstResponse.body.data.user.id },
        include: { tenant: true },
      });
      expect(membership?.tenant.code).toBe('tien-thang');
      expect(membership?.role).toBe('VIEWER');

      const tenantUsersResponse = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${firstResponse.body.data.accessToken}`)
        .expect(HttpStatus.OK);
      expect(tenantUsersResponse.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: firstResponse.body.data.user.id,
            fullName: 'Google User',
          }),
        ]),
      );
    });

    it('should add a suffix when a social username already exists', async () => {
      await prisma.user.create({
        data: {
          username: 'another-google@example.com',
          email: 'existing-google-name@example.com',
          profile: { create: { fullName: 'Existing User' } },
        },
      });
      googleTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'another-google-user-id',
        fullName: 'Google User',
        email: 'another-google@example.com',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ token: 'valid-google-id-token' })
        .expect(HttpStatus.OK);

      expect(response.body.data.user.username).toMatch(/^google_[0-9a-f]+$/);
    });

    it('should create a Facebook user when email is unavailable', async () => {
      facebookTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'facebook-user-id',
        fullName: 'Facebook User',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/facebook')
        .send({ token: 'valid-facebook-access-token' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveProperty('refreshToken');
      const user = await prisma.user.findUnique({
        where: { id: response.body.data.user.id },
      });
      expect(user?.email).toBeNull();
      const membership = await prisma.tenantUser.findFirst({
        where: { userId: response.body.data.user.id },
        include: { tenant: true },
      });
      expect(membership?.tenant.code).toBe('tien-thang');
      expect(membership?.role).toBe('VIEWER');
    });

    it('should rotate a refresh token issued by Google login', async () => {
      googleTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'google-refresh-user-id',
        fullName: 'Google Refresh User',
        email: 'google-refresh@example.com',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/google')
        .send({ token: 'valid-google-id-token' })
        .expect(HttpStatus.OK);
      const oldRefreshToken = loginResponse.body.data.refreshToken;
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(HttpStatus.OK);

      expect(refreshResponse.body.data.refreshToken).not.toBe(oldRefreshToken);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(HttpStatus.UNAUTHORIZED);

      const tokens = await prisma.refreshToken.findMany({
        where: { userId: loginResponse.body.data.user.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens[0].revokedAt).not.toBeNull();
      expect(tokens[1].revokedAt).toBeNull();
      expect(tokens.every((token) => token.tokenHash !== oldRefreshToken)).toBe(
        true,
      );
    });

    it('should rotate a refresh token issued by Facebook login', async () => {
      facebookTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'facebook-refresh-user-id',
        fullName: 'Facebook Refresh User',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/facebook')
        .send({ token: 'valid-facebook-access-token' })
        .expect(HttpStatus.OK);
      const oldRefreshToken = loginResponse.body.data.refreshToken;
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(HttpStatus.OK);

      expect(refreshResponse.body.data.refreshToken).not.toBe(oldRefreshToken);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(HttpStatus.UNAUTHORIZED);

      const tokens = await prisma.refreshToken.findMany({
        where: { userId: loginResponse.body.data.user.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens[0].revokedAt).not.toBeNull();
      expect(tokens[1].revokedAt).toBeNull();
      expect(tokens.every((token) => token.tokenHash !== oldRefreshToken)).toBe(
        true,
      );
    });
  });

  describe('POST /api/v1/auth/refresh and /api/v1/auth/logout', () => {
    const password = 'Password123';
    let user: any;
    let refreshToken: string;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          email: 'refresh@example.com',
          username: 'refreshuser',
          passwordHash,
          status: UserStatus.ACTIVE,
          role: UserRole.USER,
          profile: {
            create: {
              fullName: 'Refresh User',
            },
          },
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'refreshuser',
          password,
        });

      refreshToken = loginRes.body.data.refreshToken;
    });

    it('should rotate refresh token successfully', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('refreshToken');
          expect(res.body.data.refreshToken).not.toBe(refreshToken);
        });
    });

    it('should fail when using the same refresh token twice (rotation protection)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      // Try again with the old token
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should fail to refresh after logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
