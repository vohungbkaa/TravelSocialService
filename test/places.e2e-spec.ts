import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { UserStatus, UserRole, PlaceStatus, PriceLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';
import { assertTestDatabase } from './assert-test-database';

describe('Places & Areas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let testCategory: any;
  let testArea: any;

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
    // Clean up tables
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "PlaceImage" CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Place" CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Area" CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "PlaceCategory" CASCADE;');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE;');

    // Seed category
    testCategory = await prisma.placeCategory.create({
      data: {
        code: 'attraction',
        name: 'Attractions',
        description: 'Landmarks and points of interest',
      },
    });

    // Create users & get tokens
    const passwordHash = await bcrypt.hash('Password123', 10);

    // Admin
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'adminuser',
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.ADMIN,
        profile: { create: { fullName: 'Admin User' } },
      },
    });

    // User
    await prisma.user.create({
      data: {
        email: 'user@test.com',
        username: 'regularuser',
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
        profile: { create: { fullName: 'Regular User' } },
      },
    });

    // Login Admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'adminuser', password: 'Password123' });
    adminToken = adminLogin.body.data.accessToken;

    // Login User
    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'regularuser', password: 'Password123' });
    userToken = userLogin.body.data.accessToken;

    // Create a base area for testing
    testArea = await prisma.area.create({
      data: {
        name: 'Hanoi',
        slug: 'hanoi',
        provinceCode: '01',
        centerLat: 21.0285,
        centerLng: 105.8542,
        published: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Area CRUD (P4-T00) & Role Guard (P5-T04)', () => {
    const newArea = {
      name: 'Saigon',
      slug: 'saigon',
      provinceCode: '79',
      centerLat: 10.823,
      centerLng: 106.63,
      published: false,
    };

    it('should allow admin to create an Area', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newArea)
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.name).toBe(newArea.name);
          expect(res.body.data.slug).toBe(newArea.slug);
        });
    });

    it('should deny regular user from creating an Area', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/areas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newArea)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should deny unauthenticated requests from creating an Area', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/areas')
        .send(newArea)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should prevent deletion of Area if it has Places', async () => {
      // Create a place under testArea
      await prisma.place.create({
        data: {
          name: 'Sword Lake',
          slug: 'sword-lake',
          categoryId: testCategory.id,
          areaId: testArea.id,
          status: PlaceStatus.DRAFT,
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/v1/admin/areas/${testArea.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.message).toBe('AREA_HAS_PLACES');
        });
    });
  });

  describe('Places Management (P4-T03, P4-T06A)', () => {
    let testPlace: any;

    beforeEach(async () => {
      testPlace = await prisma.place.create({
        data: {
          name: 'West Lake',
          slug: 'west-lake',
          categoryId: testCategory.id,
          areaId: testArea.id,
          status: PlaceStatus.DRAFT,
        },
      });
    });

    it('should create a place in DRAFT status', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/places')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ba Dinh Square',
          categoryId: testCategory.id,
          areaId: testArea.id,
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.name).toBe('Ba Dinh Square');
          expect(res.body.data.status).toBe(PlaceStatus.DRAFT);
          expect(res.body.data.slug).toBe('ba-dinh-square');
        });
    });

    it('should fail publishing if name/category/lat/lng/areaId are missing', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/admin/places/${testPlace.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.message).toBe(
            'PLACE_INCOMPLETE_FOR_PUBLISHING',
          );
        });
    });

    it('should publish successfully when all required fields are set', async () => {
      await prisma.place.update({
        where: { id: testPlace.id },
        data: {
          latitude: 21.04,
          longitude: 105.83,
        },
      });

      return request(app.getHttpServer())
        .patch(`/api/v1/admin/places/${testPlace.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.status).toBe(PlaceStatus.PUBLISHED);
        });
    });

    it('should validate cost range constraints', () => {
      return request(app.getHttpServer())
        .post('/api/v1/admin/places')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Expensive Place',
          categoryId: testCategory.id,
          estimatedMinCost: 100,
          estimatedMaxCost: 50, // min > max
        })
        .expect(HttpStatus.BAD_REQUEST)
        .expect((res) => {
          expect(res.body.error.code).toBe('VALIDATION_ERROR');
          expect(res.body.error.message).toBe('MIN_COST_EXCEEDS_MAX_COST');
        });
    });

    it('should manage image gallery', async () => {
      // 1. Add image
      const addRes = await request(app.getHttpServer())
        .post(`/api/v1/admin/places/${testPlace.id}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageUrl: 'https://example.com/westlake1.jpg',
          caption: 'Sunset at West Lake',
          sortOrder: 1,
        })
        .expect(HttpStatus.CREATED);

      const imageId = addRes.body.data.id;
      expect(addRes.body.data.caption).toBe('Sunset at West Lake');

      // 2. Update image
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/admin/places/${testPlace.id}/images/${imageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          caption: 'Beautiful sunset',
        })
        .expect(HttpStatus.OK);
      expect(updateRes.body.data.caption).toBe('Beautiful sunset');

      // 3. Delete image
      await request(app.getHttpServer())
        .delete(`/api/v1/admin/places/${testPlace.id}/images/${imageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Public Retrieval APIs (P4-T04)', () => {
    beforeEach(async () => {
      // Create and publish a place
      await prisma.place.create({
        data: {
          name: 'Temple of Literature',
          slug: 'temple-of-literature',
          categoryId: testCategory.id,
          areaId: testArea.id,
          status: PlaceStatus.PUBLISHED,
          latitude: 21.029,
          longitude: 105.835,
          priceLevel: PriceLevel.LOW,
          images: {
            create: {
              imageUrl: 'https://example.com/literature.jpg',
              caption: 'Gate',
              sortOrder: 1,
            },
          },
        },
      });

      // Create a draft place (should not show up in public)
      await prisma.place.create({
        data: {
          name: 'Draft Pagoda',
          slug: 'draft-pagoda',
          categoryId: testCategory.id,
          areaId: testArea.id,
          status: PlaceStatus.DRAFT,
        },
      });
    });

    it('should retrieve public places list and exclude drafts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/places')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.places.length).toBe(1);
          expect(res.body.data.places[0].name).toBe('Temple of Literature');
          expect(res.body.data.places[0].images.length).toBe(1);
        });
    });

    it('should get detail by slug', () => {
      return request(app.getHttpServer())
        .get('/api/v1/places/slug/temple-of-literature')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.name).toBe('Temple of Literature');
        });
    });

    it('should list places in an area for public map', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/areas/${testArea.slug}/places`)
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].name).toBe('Temple of Literature');
        });
    });
  });

  describe('Place Categories Management', () => {
    it('should allow admin to create a category with a code and return integer id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/place-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST_CAT',
          name: 'Test Category',
          description: 'A test category description',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.id).toBeDefined();
          expect(typeof res.body.data.id).toBe('number');
          expect(res.body.data.code).toBe('TEST_CAT');
          expect(res.body.data.name).toBe('Test Category');
        });
    });

    it('should allow admin to create a category without a code (for user-added categories)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/place-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'User Custom Category',
          description: 'Added dynamically without code',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.data.id).toBeDefined();
          expect(typeof res.body.data.id).toBe('number');
          expect(res.body.data.code).toBeNull();
          expect(res.body.data.name).toBe('User Custom Category');
        });
    });

    it('should allow public retrieval of active categories containing id as number', () => {
      return request(app.getHttpServer())
        .get('/api/v1/place-categories')
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          const cat = res.body.data.find((c: any) => c.name === 'Attractions');
          expect(cat).toBeDefined();
          expect(typeof cat.id).toBe('number');
        });
    });

    it('should allow admin to toggle category active status using integer id', async () => {
      // First create one
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/place-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Temporary Category',
        })
        .expect(HttpStatus.CREATED);

      const catId = createRes.body.data.id;
      expect(typeof catId).toBe('number');

      // Deactivate it
      await request(app.getHttpServer())
        .patch(`/api/v1/place-categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(HttpStatus.OK)
        .expect((res) => {
          expect(res.body.data.active).toBe(false);
        });
    });
  });
});
