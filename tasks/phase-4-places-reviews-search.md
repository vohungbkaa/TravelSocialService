# Phase 4 - Places, Reviews, Search Tasks

Muc tieu phase nay la them domain du lich: dia diem, review, gan post vao place, search va field can cho itinerary sau nay.

Khong lam trong phase nay:

- Khong generate itinerary.
- Khong route optimization.
- Khong AI recommendation.
- Khong map provider paid.

## P4-T01 - Place category schema and seed

Objective:

- Tao category dia diem va seed category co ban.

Dependencies:

- P0-T05.

Model:

```txt
PlaceCategory
- id uuid
- code unique
- name
- description nullable
- createdAt
- updatedAt
```

Seed categories:

```txt
food
cafe
homestay
attraction
activity
local_market
viewpoint
culture
nature
nightlife
```

Implementation steps:

1. Add model.
2. Create seed script idempotent.
3. Add script `db:seed`.
4. API list categories.

API:

```txt
GET /api/v1/place-categories
```

Acceptance criteria:

- Seed chay nhieu lan khong duplicate.
- List categories public.

## P4-T02 - Place schema with future itinerary fields

Objective:

- Tao schema place co du field cho MVP va chuan bi itinerary sau nay.

Dependencies:

- P4-T01.

Model:

```txt
Place
- id uuid
- name
- slug unique
- description nullable
- categoryId
- address nullable
- provinceCode nullable
- districtCode nullable
- wardCode nullable
- latitude nullable
- longitude nullable
- ratingAvg decimal default 0
- ratingCount int default 0
- postCount int default 0
- priceLevel enum FREE/LOW/MEDIUM/HIGH nullable
- estimatedMinCost int nullable
- estimatedMaxCost int nullable
- averageVisitDurationMinutes int nullable
- openingHours json nullable
- status enum DRAFT/PUBLISHED/HIDDEN
- createdBy nullable
- createdAt
- updatedAt
```

Implementation steps:

1. Add enums `PlaceStatus`, `PriceLevel`.
2. Add model `Place`.
3. Add indexes:
   - slug unique.
   - categoryId.
   - provinceCode.
   - status + createdAt.
   - latitude/longitude simple indexes if useful.
4. Migration.

Acceptance criteria:

- Place luu duoc lat/lng.
- Place co cost/duration optional fields de dung sau.
- Slug unique.

Notes:

- Chua bat buoc PostGIS o free MVP de giam complexity. Co the them sau neu nearby query can chinh xac hon.

## P4-T03 - Create/update place API

Objective:

- Admin hoac role duoc phep tao/sua place.

Dependencies:

- P4-T02.
- P1-T06.

APIs:

```txt
POST  /api/v1/places
PATCH /api/v1/places/:id
```

Implementation steps:

1. Tao `PlacesModule`.
2. Tao DTO create/update.
3. Validate:
   - name 1-150.
   - lat between -90 and 90.
   - lng between -180 and 180.
   - estimated costs >= 0.
   - estimatedMinCost <= estimatedMaxCost.
   - averageVisitDurationMinutes reasonable, e.g. 15-1440.
4. Generate slug from name.
5. Handle duplicate slug by suffix short id.
6. Restrict create/update to ADMIN/SUPER_ADMIN for MVP.
7. Return place detail.

Acceptance criteria:

- Admin tao place duoc.
- User thuong tra 403.
- Invalid lat/lng tra 400.
- Duplicate name khong lam crash slug.

## P4-T04 - Place detail/list APIs

Objective:

- User browse va xem chi tiet place.

Dependencies:

- P4-T03.

APIs:

```txt
GET /api/v1/places
GET /api/v1/places/:id
GET /api/v1/places/slug/:slug
```

List query params:

```txt
q
category
provinceCode
priceLevel
limit
cursor
sort=newest|rating
```

Implementation steps:

1. Public list endpoint.
2. Filter status PUBLISHED.
3. Implement q basic using case-insensitive contains initially.
4. Filter category/province/price.
5. Cursor pagination.
6. Sort newest/rating.
7. Detail include category.

Acceptance criteria:

- Public user browse places.
- Hidden/draft khong hien public.
- Filter category/province works.
- Limit max 50.

## P4-T05 - Attach place to post

Objective:

- Post co the gan `primaryPlaceId`.

Dependencies:

- P2-T06.
- P4-T02.

Implementation steps:

1. Cap nhat `CreatePostDto` va `UpdatePostDto` neu cho update place.
2. Validate place exists va status PUBLISHED.
3. On create post:
   - set primaryPlaceId.
   - increment place.postCount.
4. On update post primaryPlaceId:
   - decrement old place count.
   - increment new place count.
5. On delete post:
   - decrement place.postCount.
6. Update post detail response include place summary.

Acceptance criteria:

- Create post with place works.
- Deleted post giam place postCount.
- Hidden/draft place khong attach duoc.
- Post detail co place summary.

## P4-T06 - List posts by place

Objective:

- Xem bai viet lien quan den dia diem.

Dependencies:

- P4-T05.

API:

```txt
GET /api/v1/places/:id/posts?limit=20&cursor=
```

Implementation steps:

1. Check place exists va published.
2. Query posts by primaryPlaceId.
3. Filter published/public.
4. Include author/media/counts/viewer state neu co auth.
5. Cursor pagination.

Acceptance criteria:

- Tra post dung place.
- Deleted/hidden/private khong hien public.
- Pagination dung.

## P4-T07 - Place review schema

Objective:

- User review/rating place va co field cost/duration cho itinerary sau nay.

Dependencies:

- P4-T02.

Model:

```txt
PlaceReview
- id uuid
- placeId
- userId
- rating int
- content nullable
- visitDate nullable
- costPerPerson nullable
- visitDurationMinutes nullable
- status enum PUBLISHED/HIDDEN/DELETED
- createdAt
- updatedAt
- unique(userId, placeId)
```

Implementation steps:

1. Add model va enum.
2. Add indexes placeId + createdAt, userId.
3. Migration.

Acceptance criteria:

- Mot user mot review/place.
- Rating 1-5 se validate o API.

## P4-T08 - Create/update place review API

Objective:

- User tao hoac cap nhat review place.

Dependencies:

- P4-T07.
- P1-T06.

APIs:

```txt
POST  /api/v1/places/:id/reviews
PATCH /api/v1/places/:id/reviews/me
```

Implementation steps:

1. Validate:
   - rating 1-5.
   - content max 2000.
   - costPerPerson >= 0 optional.
   - visitDurationMinutes 15-1440 optional.
2. Check place published.
3. Create review if not exists or return conflict depending policy.
4. Update review by owner.
5. Recompute place ratingAvg/ratingCount in transaction.
6. Return review.

Acceptance criteria:

- Rating average dung sau create/update.
- User khong tao duplicate neu policy one review.
- Cost/duration optional luu duoc.

## P4-T09 - List place reviews API

Objective:

- Xem reviews cua place.

Dependencies:

- P4-T08.

API:

```txt
GET /api/v1/places/:id/reviews?limit=20&cursor=
```

Implementation steps:

1. Check place exists/published.
2. Query reviews status PUBLISHED.
3. Cursor pagination by createdAt.
4. Include author profile.

Acceptance criteria:

- Tra dung reviews.
- Hidden/deleted reviews khong hien.
- Limit max 50.

## P4-T10 - Basic unified search

Objective:

- Search user/place/post bang PostgreSQL basic.

Dependencies:

- P1-T09.
- P2-T07.
- P4-T04.

API:

```txt
GET /api/v1/search?q=keyword
```

Response groups:

```txt
users
places
posts
```

Implementation steps:

1. Validate q min 2 chars, max 100.
2. Search users by username/displayName.
3. Search places by name.
4. Search posts by content.
5. Limit moi group, e.g. 5-10.
6. Filter only public/active/published data.
7. Return grouped response.

Acceptance criteria:

- Empty q tra 400 hoac empty theo convention.
- Hidden/deleted content khong hien.
- Search public endpoint.

## P4-T11 - PostgreSQL search optimization

Objective:

- Cai thien search bang pg_trgm/unaccent neu co the.

Dependencies:

- P4-T10.

Implementation steps:

1. Tao migration enable extension `pg_trgm`.
2. Can nhac enable `unaccent` neu supported.
3. Add trigram indexes:
   - places.name
   - users.username
   - user_profiles.displayName
4. Update search queries dung similarity/ILIKE tuy ORM support.
5. Neu Prisma kho dung, dung raw query co parameter binding an toan.

Acceptance criteria:

- Partial search tot hon.
- Khong string concatenate raw SQL gay SQL injection.
- Migration chay duoc tren PostgreSQL/Supabase.

Notes:

- Neu extension khong support tren free provider, agent phai ghi ro va fallback ve ILIKE.

