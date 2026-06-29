import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // Register pipes and filters in tests as well to mirror main.ts
    // In NestJS, e2e tests do not use main.ts, so we must register global filters/pipes manually in the test setup
    const { ValidationPipe } = require('@nestjs/common');
    const { HttpExceptionFilter } = require('./../src/common/filters/http-exception.filter');
    const { ConfigService } = require('@nestjs/config');
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter(app.get(ConfigService)));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(HttpStatus.OK)
      .expect((res) => {
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.status).toBe('ok');
        expect(res.body.data.service).toBe('travel-social-backend');
        expect(res.body.data).toHaveProperty('timestamp');
      });
  });

  describe('Validation & Error Filter /api/v1/test-validation (POST)', () => {
    it('should pass validation with correct data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'valid@example.com',
          password: 'securepassword',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toEqual({
            email: 'valid@example.com',
            password: 'securepassword',
          });
        });
    });

    it('should return custom validation error format on invalid email and password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
          expect(res.body.error).toEqual(
            expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
            }),
          );
          expect(res.body.error.details.errors).toContain('Invalid email address');
          expect(res.body.error.details.errors).toContain('Password must be at least 6 characters long');
        });
    });

    it('should fail with whitelist filter when extra fields are provided', () => {
      return request(app.getHttpServer())
        .post('/api/v1/test-validation')
        .send({
          email: 'valid@example.com',
          password: 'securepassword',
          extraField: 'not-allowed',
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.details.errors[0]).toContain('property extraField should not exist');
        });
    });
  });
});
