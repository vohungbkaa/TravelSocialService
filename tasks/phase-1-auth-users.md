# Phase 1 - Auth and Users Tasks

Muc tieu phase nay la co dang ky, dang nhap, refresh token, auth guard va profile user.

Level 0 cost guardrails:

- Auth phai tu host trong NestJS + PostgreSQL, khong dung paid auth provider.
- Khong dung Supabase Auth cho core auth de tranh lock-in va giu business logic trong backend.
- Khong gui email bat buoc trong MVP vi email provider co the phat sinh chi phi.
- Refresh token luu trong PostgreSQL, khong yeu cau Redis/session store.
- OAuth/social login de phase sau, khong lam neu chua validate user.
- Admin dang dia danh chi can email/password + role `ADMIN`/`SUPER_ADMIN`, khong can email verification trong MVP.

Khong lam trong phase nay:

- Khong OAuth Google/Facebook/Apple.
- Khong email verification.
- Khong password reset.
- Khong admin moderation.

## P1-T01 - User and auth database schema

Objective:

- Tao schema cho user, profile, auth account va refresh token.

Dependencies:

- P0-T05.

Prisma models:

```txt
User
UserProfile
AuthAccount
RefreshToken
```

Fields:

```txt
User:
- id uuid
- email unique nullable
- phone unique nullable
- username unique
- passwordHash nullable
- status enum ACTIVE/SUSPENDED/DELETED
- role enum USER/ADMIN/SUPER_ADMIN
- createdAt
- updatedAt
- deletedAt nullable

UserProfile:
- userId pk
- displayName
- bio nullable
- avatarMediaId nullable
- coverMediaId nullable
- homeProvinceId nullable
- websiteUrl nullable
- postCount default 0
- followerCount default 0
- followingCount default 0
- createdAt
- updatedAt

RefreshToken:
- id uuid
- userId
- tokenHash
- expiresAt
- revokedAt nullable
- createdAt
```

Implementation steps:

1. Add enums vao Prisma schema.
2. Add models va relations.
3. Add indexes/unique constraints.
4. Tao migration.
5. Generate Prisma client.

Acceptance criteria:

- Migration apply thanh cong.
- `User.username` unique.
- `User.email` unique nullable.
- `UserProfile.userId` one-to-one voi `User`.
- Refresh token relation toi user.

Test/verification:

```txt
npx prisma migrate dev
npm run build
```

## P1-T02 - Register API

Objective:

- User dang ky bang email, username, password.

Dependencies:

- P1-T01.
- P0-T06.

API:

```txt
POST /api/v1/auth/register
```

Request:

```json
{
  "email": "user@example.com",
  "username": "localtraveler",
  "password": "StrongPassword123",
  "displayName": "Local Traveler"
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "localtraveler",
    "displayName": "Local Traveler",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

Implementation steps:

1. Tao `AuthModule`.
2. Tao `RegisterDto`.
3. Validate:
   - email format.
   - username 3-30 chars, lowercase/number/underscore neu chon rule nay.
   - password min 8 chars.
   - displayName max 80 chars.
4. Hash password bang Argon2 hoac bcrypt.
5. Check duplicate email/username.
6. Tao `User` va `UserProfile` trong transaction.
7. Tra public user object.
8. Them Swagger decorators.

Acceptance criteria:

- Register thanh cong voi input hop le.
- Duplicate email tra 409 `EMAIL_ALREADY_EXISTS`.
- Duplicate username tra 409 `USERNAME_ALREADY_EXISTS`.
- Password khong bao gio tra ra response.
- Password trong DB la hash.

Test cases:

- Register success.
- Invalid email.
- Weak password.
- Duplicate email.
- Duplicate username.

## P1-T03 - Login API

Objective:

- User dang nhap bang email hoac username va nhan access/refresh token.

Dependencies:

- P1-T02.

API:

```txt
POST /api/v1/auth/login
```

Request:

```json
{
  "identifier": "user@example.com",
  "password": "StrongPassword123"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "opaque-token",
    "user": {
      "id": "uuid",
      "username": "localtraveler",
      "displayName": "Local Traveler"
    }
  }
}
```

Implementation steps:

1. Tao `LoginDto`.
2. Tim user theo email hoac username.
3. Reject neu user khong active.
4. Verify password.
5. Tao JWT access token voi claims:
   - sub
   - username
   - role
6. Tao refresh token random opaque.
7. Hash refresh token va luu `RefreshToken`.
8. Tra token va user public.
9. Them Swagger docs.

Acceptance criteria:

- Login dung tra tokens.
- Login sai password tra 401 `INVALID_CREDENTIALS`.
- User suspended tra 403.
- Refresh token luu hash, khong luu plain text.

Test cases:

- Login by email.
- Login by username.
- Wrong password.
- Unknown user.

## P1-T04 - Refresh token rotation

Objective:

- Cap access token moi va rotate refresh token.

Dependencies:

- P1-T03.

API:

```txt
POST /api/v1/auth/refresh
```

Request:

```json
{
  "refreshToken": "opaque-token"
}
```

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "new-opaque-token"
  }
}
```

Implementation steps:

1. Tao `RefreshTokenDto`.
2. Hash input token va tim trong DB.
3. Check:
   - token exists.
   - not revoked.
   - not expired.
   - user active.
4. Trong transaction:
   - set old token revokedAt.
   - create new refresh token hash.
5. Tao access token moi.
6. Tra tokens moi.

Acceptance criteria:

- Token hop le refresh thanh cong.
- Token cu khong dung lai duoc.
- Expired/revoked token tra 401.
- Rotation khong tao nhieu token active tu cung token cu.

Test cases:

- Refresh success.
- Reuse old refresh token fail.
- Expired token fail.

## P1-T05 - Logout API

Objective:

- Revoke refresh token hien tai.

Dependencies:

- P1-T04.

API:

```txt
POST /api/v1/auth/logout
```

Request:

```json
{
  "refreshToken": "opaque-token"
}
```

Implementation steps:

1. Hash refresh token input.
2. Tim token active.
3. Set `revokedAt`.
4. Response success idempotent, khong can tiet lo token ton tai hay khong.

Acceptance criteria:

- Logout token hop le thanh cong.
- Token sau logout refresh fail.
- Goi logout lan 2 van tra success.

## P1-T06 - JWT auth guard and CurrentUser decorator

Objective:

- Bao ve protected endpoints bang JWT.

Dependencies:

- P1-T03.

Expected files:

```txt
src/common/guards/jwt-auth.guard.ts
src/common/decorators/current-user.decorator.ts
src/auth/strategies/jwt.strategy.ts
```

Implementation steps:

1. Cai Passport JWT neu dung Nest passport.
2. Implement JWT strategy doc secret tu config.
3. Validate payload va gan user context.
4. Tao `JwtAuthGuard`.
5. Tao `@CurrentUser()`.
6. Tao `@Public()` decorator neu muon skip auth global sau nay.

Acceptance criteria:

- Endpoint protected khong co bearer token tra 401.
- Token invalid tra 401.
- Token valid lay duoc `userId`, `role`, `username`.

Test cases:

- Protected route without token.
- Protected route with invalid token.
- Protected route with valid token.

## P1-T07 - Get current user profile

Objective:

- User xem thong tin tai khoan cua minh.

Dependencies:

- P1-T06.

API:

```txt
GET /api/v1/users/me
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "localtraveler",
    "role": "USER",
    "status": "ACTIVE",
    "profile": {
      "displayName": "Local Traveler",
      "bio": null,
      "avatarUrl": null,
      "postCount": 0,
      "followerCount": 0,
      "followingCount": 0
    }
  }
}
```

Implementation steps:

1. Tao `UsersModule`.
2. Tao `UsersController`.
3. Tao `UsersService`.
4. Endpoint protected bang JWT.
5. Query user + profile.
6. Hide passwordHash, deletedAt, token data.

Acceptance criteria:

- User authenticated xem duoc profile.
- Khong tra sensitive fields.
- User deleted/suspended xu ly theo auth policy.

## P1-T08 - Update current user profile

Objective:

- User cap nhat profile public.

Dependencies:

- P1-T07.

API:

```txt
PATCH /api/v1/users/me/profile
```

Request:

```json
{
  "displayName": "Traveler Name",
  "bio": "I love local trips",
  "websiteUrl": "https://example.com"
}
```

Implementation steps:

1. Tao `UpdateProfileDto`.
2. Validate:
   - displayName 1-80.
   - bio max 500.
   - websiteUrl valid URL va max length.
3. Update `UserProfile` cua current user.
4. Return updated profile.

Acceptance criteria:

- User update duoc profile cua minh.
- Bio qua dai tra 400.
- Website invalid tra 400.

## P1-T09 - Public user profile

Objective:

- Xem profile cong khai cua user khac.

Dependencies:

- P1-T07.

APIs:

```txt
GET /api/v1/users/:id
GET /api/v1/users/username/:username
```

Implementation steps:

1. Implement lookup by id.
2. Implement lookup by username.
3. Chi tra user active.
4. Include profile counters.
5. Neu request co auth optional, include `viewer.isFollowing` sau khi follow module co san. Neu chua co follow module, de false/null va TODO ro.

Acceptance criteria:

- User public active xem duoc.
- User not found tra 404.
- Khong tra email neu policy public khong can email.

## P1-T10 - Seed first admin user for free MVP

Objective:

- Tao tai khoan admin dau tien de dung admin API trong MVP ma khong can paid auth provider hay admin console phuc tap.

Dependencies:

- P1-T01.
- P1-T02.

Expected files:

```txt
prisma/seed.ts hoac src/scripts/seed-admin.ts
package.json
.env.example
```

Environment variables:

```txt
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=change-me-now
SEED_ADMIN_DISPLAY_NAME=Administrator
```

Implementation steps:

1. Tao seed script idempotent.
2. Doc admin email/username/password tu env.
3. Validate password khong rong va khong dung default trong production.
4. Hash password bang cung algorithm voi Register API.
5. Neu admin da ton tai:
   - khong tao duplicate.
   - co the update role len `ADMIN` neu email khop va policy cho phep.
6. Tao `User` role `ADMIN`, status `ACTIVE`.
7. Tao `UserProfile` neu chua co.
8. Them script `db:seed-admin`.
9. Cap nhat `.env.example`.

Acceptance criteria:

- Chay seed nhieu lan khong duplicate.
- Admin login duoc bang API login.
- Khong can Supabase Auth.
- Khong can paid email provider.
- Script khong in password ra log.

Scale-later notes:

- Khi co user that, thay seed-only flow bang admin management UI/API co audit log.
- Co the them email verification/2FA sau, khong bat buoc Level 0.
