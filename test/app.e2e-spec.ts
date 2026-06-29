import { Test, TestingModule } from '@nestjs/testing';
import {
  Body,
  Controller,
  HttpStatus,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Public } from './../src/common/decorators/public.decorator';

class TestValidationDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

@Controller('test-validation')
@Public()
class TestValidationController {
  @Post()
  testValidation(@Body() body: TestValidationDto) {
    return { success: true, data: body };
  }
}

interface HealthBody {
  data: {
    status: string;
    service: string;
    timestamp: string;
  };
}

interface ValidationSuccessBody {
  success: boolean;
  data: {
    email: string;
    password: string;
  };
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: {
      errors?: string[];
    };
  };
}

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestValidationController],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

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
        const body = res.body as HealthBody;
        expect(body).toHaveProperty('data');
        expect(body.data.status).toBe('ok');
        expect(body.data.service).toBe('travel-social-backend');
        expect(body.data).toHaveProperty('timestamp');
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
        .expect((res: Response) => {
          const body = res.body as ValidationSuccessBody;
          expect(body).toHaveProperty('success', true);
          expect(body.data).toEqual({
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
        .expect((res: Response) => {
          const body = res.body as ErrorBody;
          expect(body).toHaveProperty('error');
          expect(body.error).toEqual(
            expect.objectContaining({
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
            }),
          );
          expect(body.error.details?.errors).toContain('Invalid email address');
          expect(body.error.details?.errors).toContain(
            'Password must be at least 6 characters long',
          );
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
        .expect((res: Response) => {
          const body = res.body as ErrorBody;
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(body.error.details?.errors?.[0]).toContain(
            'property extraField should not exist',
          );
        });
    });
  });
});
