# Phase 5 - Notifications, Admin, Deployment Tasks

Muc tieu phase nay la them notification stored, admin moderation co ban va deployment 0 USD.

Level 0 cost guardrails:

- Notification chi la stored notification trong PostgreSQL, khong realtime/WebSocket.
- Admin/moderation chay trong cung NestJS app, khong tach admin service rieng.
- Deployment mac dinh la Render Free + Supabase Free Postgres + Cloudflare R2 Free.
- Dockerfile de portability, nhung khong bat buoc VPS/paid container hosting.
- Monitoring mac dinh dung platform logs; Sentry chi optional free tier.
- RoleGuard phai dung role trong JWT/database, khong phu thuoc paid IAM/auth provider.

Khong lam trong phase nay:

- Khong realtime WebSocket.
- Khong queue worker.
- Khong paid infrastructure bat buoc.

## P5-T01 - Notification schema

Objective:

- Persist notifications cho like/comment/follow.

Dependencies:

- P1-T01.

Model:

```txt
Notification
- id uuid
- recipientId
- actorId nullable
- type enum FOLLOW/POST_LIKE/POST_COMMENT/COMMENT_REPLY/SYSTEM
- entityType nullable
- entityId nullable
- data json
- readAt nullable
- createdAt
```

Implementation steps:

1. Add enum `NotificationType`.
2. Add model.
3. Index recipientId + createdAt.
4. Index readAt optional.
5. Migration.

Acceptance criteria:

- Migration apply thanh cong.
- Notification relation recipient/actor toi user.

## P5-T02 - Notification service integration

Objective:

- Cac module social tao notification qua service chung.

Dependencies:

- P5-T01.
- P3-T02.
- P3-T06.
- P3-T09.

Implementation steps:

1. Tao `NotificationsModule`.
2. Tao `NotificationsService.create`.
3. Rules:
   - Khong notify neu actorId == recipientId.
   - Like post notify author post.
   - Comment post notify author post.
   - Reply comment notify parent comment author.
   - Follow notify target user.
4. Goi service tu reaction/comment/follow modules.
5. Dedupe simple cho like/follow neu can, tranh spam duplicate.

Acceptance criteria:

- Like post tao notification cho author.
- Comment post tao notification.
- Follow tao notification.
- Self-action khong tao notification.

## P5-T03 - Notification APIs

Objective:

- User xem va mark read notification.

Dependencies:

- P5-T02.

APIs:

```txt
GET   /api/v1/notifications?limit=20&cursor=
GET   /api/v1/notifications/unread-count
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

Implementation steps:

1. Protected endpoints.
2. List only current user's notifications.
3. Cursor pagination.
4. Mark one read checks ownership.
5. Mark all read current user only.
6. Unread count query.

Acceptance criteria:

- User khong xem/mark notification cua user khac.
- readAt duoc set.
- Pagination dung.

## P5-T04 - Role guard

Objective:

- Bao ve admin APIs.
- Bat buoc cho MVP path admin dang dia danh.

Dependencies:

- P1-T06.

Expected files:

```txt
src/common/decorators/roles.decorator.ts
src/common/guards/roles.guard.ts
```

Implementation steps:

1. Tao `@Roles(...roles)`.
2. Tao `RolesGuard`.
3. Guard doc role tu current user/JWT.
4. Ap dung cho admin routes.
5. Dam bao route `/api/v1/admin/areas` va `/api/v1/admin/places` chi cho `ADMIN`/`SUPER_ADMIN`.

Acceptance criteria:

- USER vao admin route tra 403.
- ADMIN/SUPER_ADMIN vao duoc.
- Khong can paid auth provider.

Scale-later notes:

- Khi co nhieu admin, them audit log va area-level permission.
- Khi co production traffic, can nhac 2FA/email verification sau, khong bat buoc Level 0.

## P5-T05 - Report schema and create report API

Objective:

- User report content xau.

Dependencies:

- P5-T04.

Model:

```txt
Report
- id uuid
- reporterId
- entityType enum POST/COMMENT/USER/PLACE
- entityId uuid
- reason enum SPAM/HARASSMENT/INAPPROPRIATE/FAKE/OTHER
- description nullable
- status enum OPEN/REVIEWING/RESOLVED/REJECTED
- createdAt
- updatedAt
```

API:

```txt
POST /api/v1/reports
```

Implementation steps:

1. Add models/enums migration.
2. Validate entityType/reason.
3. Optionally verify target entity exists.
4. Prevent duplicate report spam optional.
5. Create report.

Acceptance criteria:

- Auth user tao report duoc.
- Description max length.
- Invalid entity type reject.

## P5-T06 - Admin report list and resolve

Objective:

- Admin xem va xu ly report.

Dependencies:

- P5-T05.

APIs:

```txt
GET   /api/v1/admin/reports?status=OPEN&limit=20&cursor=
PATCH /api/v1/admin/reports/:id/resolve
```

Implementation steps:

1. Protected by JWT + RolesGuard.
2. List reports with reporter summary.
3. Filter by status.
4. Resolve:
   - set status RESOLVED/REJECTED.
   - store resolution note optional.
5. Add Swagger.

Acceptance criteria:

- User thuong 403.
- Admin list duoc.
- Resolve update status.

## P5-T07 - Moderation actions and audit log

Objective:

- Admin hide post/comment va ghi audit.

Dependencies:

- P5-T04.
- P2-T09.
- P3-T04.

Models:

```txt
ModerationAction
- id uuid
- adminId
- action enum HIDE_POST/HIDE_COMMENT/SUSPEND_USER/RESTORE_POST/RESTORE_COMMENT
- entityType
- entityId
- reason nullable
- createdAt

AuditLog
- id uuid
- actorId nullable
- action
- entityType nullable
- entityId nullable
- metadata json nullable
- createdAt
```

APIs:

```txt
PATCH /api/v1/admin/posts/:id/hide
PATCH /api/v1/admin/comments/:id/hide
PATCH /api/v1/admin/users/:id/suspend
```

Implementation steps:

1. Add models/enums migration.
2. Implement admin endpoints.
3. Each moderation action updates target status.
4. Each action creates ModerationAction and AuditLog.
5. Prevent admin self-suspend unless SUPER_ADMIN policy ro.

Acceptance criteria:

- Hidden post khong hien feed/detail public.
- Hidden comment khong hien list.
- Suspend user cannot login/use protected API if policy implemented.
- Audit record created.

## P5-T08 - Production Dockerfile

Objective:

- Build backend Docker image deployable.

Dependencies:

- P0-T05.

Expected files:

```txt
Dockerfile
.dockerignore
```

Implementation steps:

1. Multi-stage Dockerfile.
2. Install dependencies.
3. Generate Prisma client.
4. Build NestJS.
5. Runtime only production deps if practical.
6. Start command:
   - `node dist/main.js`
7. `.dockerignore` excludes:
   - node_modules
   - dist
   - .env
   - .git

Acceptance criteria:

- `docker build .` thanh cong.
- Container starts with env.

## P5-T09 - Render free deployment config

Objective:

- Deploy API len Render Free cho muc tieu 0 USD.

Dependencies:

- P5-T08.

Expected files:

```txt
render.yaml optional
docs/deploy-render-free.md
```

Implementation steps:

1. Document tao Render Web Service.
2. Build command.
3. Start command.
4. Required env variables.
5. Health check path `/api/v1/health`.
6. Note cold start/sleep limitation.
7. Document Prisma migration strategy:
   - run migration manually.
   - or release command if platform supports.

Acceptance criteria:

- Doc du de deploy tu GitHub.
- Khong yeu cau paid service.
- Co warning ve free tier limitations.

## P5-T10 - Supabase free Postgres setup guide

Objective:

- Huong dan tao database free va ket noi backend.

Dependencies:

- P0-T05.

Expected file:

```txt
docs/setup-supabase-free-postgres.md
```

Implementation steps:

1. Document create Supabase project.
2. Copy Postgres connection string.
3. Set `DATABASE_URL`.
4. Run migrations.
5. Security note:
   - frontend khong dung Supabase anon key cho core business.
   - all business access qua NestJS API.
6. Backup/export note.

Acceptance criteria:

- Developer moi co the setup DB.
- Document ro khong dung Supabase Auth/Realtime cho core MVP.

## P5-T11 - Cloudflare R2 setup guide

Objective:

- Huong dan tao R2 bucket free va env cho media upload.

Dependencies:

- P2-T02.

Expected file:

```txt
docs/setup-cloudflare-r2.md
```

Implementation steps:

1. Document create R2 bucket.
2. Create API token/access key.
3. Get S3 endpoint.
4. Configure public/custom domain hoac public base URL.
5. Set env:
   - R2_ENDPOINT
   - R2_ACCESS_KEY_ID
   - R2_SECRET_ACCESS_KEY
   - R2_BUCKET
   - R2_PUBLIC_BASE_URL
6. Security notes:
   - never expose secret to frontend.
   - frontend only receives presigned upload URL.

Acceptance criteria:

- Doc du de tao bucket va upload test.

## P5-T12 - Basic CI

Objective:

- Tao GitHub Actions basic de build/test.

Dependencies:

- P0-T01.

Expected file:

```txt
.github/workflows/ci.yml
```

Implementation steps:

1. Workflow on pull_request/push.
2. Setup Node version.
3. Install dependencies.
4. Run:
   - lint if available.
   - test if available.
   - build.
5. Khong can deploy automatic luc dau.

Acceptance criteria:

- CI pass tren clean checkout.
- Khong can secret cho CI basic.
