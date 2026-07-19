import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { UserStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GoogleTokenVerifier } from './../src/auth/google-token-verifier.service';
import { FacebookTokenVerifier } from './../src/auth/facebook-token-verifier.service';

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

    app = moduleFixture.createNestApplication();

    // Register pipes and filters
    const { ValidationPipe } = require('@nestjs/common');
    const {
      HttpExceptionFilter,
    } = require('./../src/common/filters/http-exception.filter');
    const { ConfigService } = require('@nestjs/config');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(app.get(ConfigService)));
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

    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
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
              displayName: 'Login User',
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
        displayName: 'Google User',
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
      expect(await prisma.socialAuthIdentity.count()).toBe(1);
    });

    it('should create a Facebook user when email is unavailable', async () => {
      facebookTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'facebook-user-id',
        displayName: 'Facebook User',
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
    });

    it('should rotate a refresh token issued by Google login', async () => {
      googleTokenVerifier.verify.mockResolvedValue({
        providerUserId: 'google-refresh-user-id',
        displayName: 'Google Refresh User',
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
        displayName: 'Facebook Refresh User',
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
              displayName: 'Refresh User',
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
