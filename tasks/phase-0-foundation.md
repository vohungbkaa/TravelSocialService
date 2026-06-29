# Phase 0 - Foundation Tasks

Muc tieu phase nay la tao nen mong backend: NestJS project, config, database, validation, error format, Swagger, Docker local va health check.

Khong lam trong phase nay:

- Khong implement business module ngoai health/config/database.
- Khong them Redis.
- Khong them queue.
- Khong them search engine.
- Khong deploy production.

## P0-T01 - Initialize NestJS project

Objective:

- Tao backend NestJS san sang cho modular monolith.

Dependencies:

- Khong co.

Expected files:

```txt
package.json
tsconfig.json
nest-cli.json
src/main.ts
src/app.module.ts
src/common/
src/config/
src/database/
```

Implementation steps:

1. Khoi tao NestJS project TypeScript.
2. Cau hinh `src/main.ts`:
   - Global prefix `/api/v1`.
   - Enable shutdown hooks neu can.
   - Enable CORS doc theo env.
3. Tao `AppModule`.
4. Tao folder base:
   - `src/common/decorators`
   - `src/common/filters`
   - `src/common/guards`
   - `src/common/interceptors`
   - `src/common/pipes`
   - `src/config`
   - `src/database`
5. Them scripts trong `package.json`:
   - `start`
   - `start:dev`
   - `build`
   - `lint`
   - `format`
   - `test`
6. Cau hinh TypeScript strict neu khong pha Nest default qua nhieu.

Acceptance criteria:

- `npm run start:dev` chay duoc.
- `npm run build` thanh cong.
- App lang nghe port tu `PORT` env, default `3000`.
- Tat ca route backend nam duoi `/api/v1`.

Test/verification:

```txt
npm run build
npm run start:dev
curl http://localhost:3000/api/v1/health
```

Notes for agent:

- Neu repo chua co package manager lockfile, chon `npm` de don gian.
- Khong them library khong can thiet.

## P0-T02 - Environment config module

Objective:

- Tao config system doc tu environment variables va validate env khi app boot.

Dependencies:

- P0-T01.

Expected files:

```txt
.env.example
src/config/config.module.ts
src/config/env.validation.ts
src/config/app.config.ts
```

Environment variables:

```txt
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_social
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
R2_ENDPOINT=
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Implementation steps:

1. Cai va cau hinh `@nestjs/config`.
2. Tao validation schema cho env bang Joi hoac Zod.
3. App phai fail fast neu missing env bat buoc.
4. Tao config helper de doc:
   - app port
   - database url
   - jwt secrets/ttl
   - r2 config
   - cors origins
5. Cap nhat `.env.example`.

Acceptance criteria:

- App boot thanh cong voi `.env` hop le.
- App fail ro rang neu thieu `DATABASE_URL`.
- `.env.example` khong chua secret that.

Test/verification:

```txt
npm run build
cp .env.example .env
npm run start:dev
```

Notes for agent:

- Khong commit `.env`.
- Secrets trong `.env.example` chi la placeholder.

## P0-T03 - Health check endpoint

Objective:

- Them endpoint health check cho deploy platform va monitoring.

Dependencies:

- P0-T01.

Expected files:

```txt
src/health/health.module.ts
src/health/health.controller.ts
src/health/health.service.ts
```

API contract:

```txt
GET /api/v1/health
```

Response:

```json
{
  "data": {
    "status": "ok",
    "service": "travel-social-backend",
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

Implementation steps:

1. Tao `HealthModule`.
2. Tao `HealthController`.
3. Tra response format chung `data`.
4. Khong can DB check o task nay.

Acceptance criteria:

- Endpoint public, khong can auth.
- Response co timestamp ISO.
- HTTP status 200.

Test/verification:

```txt
curl http://localhost:3000/api/v1/health
```

## P0-T04 - Docker Compose for local development

Objective:

- Cho developer chay PostgreSQL local bang Docker Compose.

Dependencies:

- P0-T02.

Expected files:

```txt
docker-compose.yml
.env.example
```

Services:

```txt
postgres:
  image: postgres
  port: 5432
  database: travel_social
  user: postgres
  password: postgres
```

Implementation steps:

1. Tao `docker-compose.yml` co service PostgreSQL.
2. Them volume named cho data.
3. Them healthcheck cho PostgreSQL neu phu hop.
4. Dong bo `DATABASE_URL` trong `.env.example`.

Acceptance criteria:

- `docker compose up -d postgres` chay duoc.
- Port 5432 expose local.
- Database name/user/password khop `.env.example`.

Test/verification:

```txt
docker compose up -d postgres
docker compose ps
```

Notes for agent:

- Khong them Redis trong phase nay.

## P0-T05 - Prisma setup

Objective:

- Ket noi PostgreSQL bang Prisma va tao database service.

Dependencies:

- P0-T02.
- P0-T04.

Expected files:

```txt
prisma/schema.prisma
src/database/database.module.ts
src/database/prisma.service.ts
package.json
```

Implementation steps:

1. Cai `prisma` va `@prisma/client`.
2. Tao `prisma/schema.prisma`.
3. Cau hinh datasource PostgreSQL doc `DATABASE_URL`.
4. Tao `PrismaService` extends `PrismaClient`.
5. Tao `DatabaseModule` export `PrismaService`.
6. Them scripts:
   - `prisma:generate`
   - `prisma:migrate`
   - `prisma:studio`
7. Chay migration initial neu schema co model.

Acceptance criteria:

- `npx prisma generate` thanh cong.
- App inject duoc `PrismaService`.
- `npm run build` thanh cong.

Test/verification:

```txt
docker compose up -d postgres
npx prisma generate
npm run build
```

## P0-T06 - Global validation and error format

Objective:

- Tat ca API co input validation va error format thong nhat.

Dependencies:

- P0-T01.

Expected files:

```txt
src/common/filters/http-exception.filter.ts
src/common/types/api-response.type.ts
src/common/errors/error-codes.ts
src/main.ts
```

Error response contract:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {}
  }
}
```

Implementation steps:

1. Enable global validation pipe:
   - whitelist true
   - forbidNonWhitelisted true
   - transform true
2. Tao exception filter cho HTTP exceptions.
3. Normalize validation errors thanh response format chung.
4. Khong leak stack trace trong production.
5. Dinh nghia error codes common:
   - `VALIDATION_ERROR`
   - `UNAUTHORIZED`
   - `FORBIDDEN`
   - `NOT_FOUND`
   - `CONFLICT`
   - `INTERNAL_ERROR`

Acceptance criteria:

- DTO invalid tra 400 format chung.
- Unknown error tra 500 format chung.
- Production response khong co stack.

Test/verification:

- Tao tam endpoint DTO invalid hoac verify o task auth sau.
- `npm run build`.

## P0-T07 - Swagger/OpenAPI setup

Objective:

- Tao API docs cho frontend/mobile/admin.

Dependencies:

- P0-T01.

Expected files:

```txt
src/main.ts
```

API:

```txt
GET /docs
```

Implementation steps:

1. Cai `@nestjs/swagger`.
2. Cau hinh Swagger document:
   - title: Travel Social Service API
   - version: 1.0
   - bearer auth
3. Serve docs tai `/docs`.
4. Dam bao docs khong nam duoi `/api/v1`.

Acceptance criteria:

- Truy cap `/docs` duoc khi app local chay.
- Swagger co bearer auth schema.
- `npm run build` thanh cong.

Test/verification:

```txt
curl http://localhost:3000/docs
```

