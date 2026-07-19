import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { PrismaService } from './../src/database/prisma.service';
import { assertTestDatabase } from './assert-test-database';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;

  const tenantId = '00000000-0000-4000-8000-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const configService = moduleFixture.get(ConfigService);
    assertTestDatabase(configService.getOrThrow<string>('DATABASE_URL'));

    app = moduleFixture.createNestApplication();
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
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE;');

    const users = await Promise.all([
      createTenantUser('current@example.com', 'Người hiện tại', null),
      createTenantUser(
        'vo@example.com',
        'Võ Văn Hưng',
        'https://example.com/avatar.jpg',
      ),
      createTenantUser('anh@example.com', 'Đặng Ánh', '/media/avatars/anh.jpg'),
    ]);

    accessToken = app.get(JwtService).sign({
      sub: users[0].id,
      username: users[0].username,
      role: UserRole.USER,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createTenantUser(
    email: string,
    fullName: string,
    avatarMediaId: string | null,
  ) {
    return prisma.user.create({
      data: {
        email,
        username: email,
        profile: { create: { fullName, avatarMediaId } },
        tenants: {
          create: { tenantId, role: 'VIEWER' },
        },
      },
    });
  }

  it('supports paging and excluding the current user', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ page: 1, pageSize: 1, includeCurrentUser: false })
      .expect(HttpStatus.OK);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 2,
      totalPages: 2,
      hasNext: true,
    });
    expect(response.body.data[0].email).not.toBe('current@example.com');
  });

  it('includes the current user by default', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ q: 'Người hiện tại' })
      .expect(HttpStatus.OK);

    expect(response.body.data).toEqual([
      expect.objectContaining({ email: 'current@example.com' }),
    ]);
  });

  it.each(['Vo Van', 'Võ Văn'])(
    'searches Vietnamese names with query "%s"',
    async (q) => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ q, includeCurrentUser: false })
        .expect(HttpStatus.OK);

      expect(response.body.data).toEqual([
        expect.objectContaining({
          email: 'vo@example.com',
          fullName: 'Võ Văn Hưng',
          avatarUrl: 'https://example.com/avatar.jpg',
        }),
      ]);
    },
  );

  it('returns a relative local avatar URL for client-side resolution', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ q: 'Đặng Ánh' })
      .expect(HttpStatus.OK);

    expect(response.body.data[0].avatarUrl).toBe('/media/avatars/anh.jpg');
  });

  it('returns the authenticated user profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(HttpStatus.OK);

    expect(response.body.data).toMatchObject({
      username: 'current@example.com',
      email: 'current@example.com',
      fullName: 'Người hiện tại',
      avatarUrl: null,
      coverUrl: null,
      postCount: 0,
    });
  });

  it('updates full name, bio, avatar and cover for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Võ Văn Hưng',
        bio: 'Tiểu sử mới',
        avatarUrl: '/uploads/images/avatar.jpg',
        coverUrl: '/uploads/images/cover.jpg',
      })
      .expect(HttpStatus.OK);

    expect(response.body.data).toMatchObject({
      fullName: 'Võ Văn Hưng',
      bio: 'Tiểu sử mới',
      avatarUrl: '/media/images/avatar.jpg',
      coverUrl: '/media/images/cover.jpg',
    });

    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: response.body.data.id },
    });
    expect(profile).toMatchObject({
      fullName: 'Võ Văn Hưng',
      bio: 'Tiểu sử mới',
      avatarMediaId: '/uploads/images/avatar.jpg',
      coverMediaId: '/uploads/images/cover.jpg',
    });
  });

  it('rejects an empty full name', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: '   ' })
      .expect(HttpStatus.BAD_REQUEST);
  });
});
