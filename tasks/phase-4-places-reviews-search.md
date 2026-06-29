# Phase 4 - Places, Reviews, Search Tasks

Muc tieu phase nay la them domain du lich: khu vuc ban do, dia diem/dia danh, review, gan post vao place, search va field can cho itinerary sau nay.

Context tu `TravelSocialWebApp`:

- Public route dang dung `/:provinceCode/:areaSlug`.
- MapLibre can `areas` co center/bounds va `places` co `lat/lng`.
- Admin dashboard can quan ly areas va places.
- Admin can dang dia danh voi ten, dia chi, toa do lat/long, category, mo ta, local tip, best time, price range, cover/media va trang thai published.
- Public map chi hien area/place da published.

MVP path priority:

- Neu muc tieu la admin dang dia danh va client load public map, lam P4-T00 den P4-T04 va P4-T06A truoc.
- Reviews, attach post, search nang cao co the de sau.
- API phai tra format on dinh cho WebApp de thay mockPlaces bang backend data.

Level 0 cost guardrails:

- Search MVP phai dung PostgreSQL truoc, khong dung OpenSearch/Elasticsearch.
- Nearby/location MVP chi luu latitude/longitude va filter co ban; khong bat buoc PostGIS neu free deploy phuc tap.
- Khong goi paid map/routing/geocoding API trong request path.
- Cost/duration fields chi la optional structured data de sau nay dung cho itinerary.
- Seed data phai idempotent va nho, khong tao dataset lon lam vuot free database.
- Khong dung paid geocoding/map API de lay toa do. Admin nhap lat/lng hoac frontend cho click tren MapLibre de lay toa do.
- Media cua dia danh ban dau dung URL ngoai/public path, khong upload file qua backend trong Phase 4.

Scale-later guardrails:

- `Area` va `Place` schema phai dung PostgreSQL/Prisma portable, khong phu thuoc Supabase-specific feature.
- `lat/lng` luu dang numeric/decimal de sau nay them PostGIS khong can doi API.
- Public list API phai co pagination/filter de free DB khong bi query qua nang.
- Place media links di qua fields/model rieng de sau nay migrate sang R2/S3/CDN khong sua client contract lon.

Khong lam trong phase nay:

- Khong generate itinerary.
- Khong route optimization.
- Khong AI recommendation.
- Khong map provider paid.

## P4-T00 - Area schema and admin CRUD

Objective:

- Tao backend cho khu vuc ban do (`areas`) de WebApp co the render route public `/:provinceCode/:areaSlug` va admin quan ly pham vi noi dung.

Dependencies:

- P1-T06.
- P5-T04.
- P1-T10 khuyen nghi de co admin dau tien test API.

Model:

```txt
Area
- id uuid
- name
- slug unique
- provinceCode nullable
- description nullable
- coverUrl nullable
- centerLat decimal
- centerLng decimal
- defaultRadiusKm decimal default 3
- published boolean default false
- createdAt
- updatedAt
```

APIs:

```txt
GET   /api/v1/areas
GET   /api/v1/areas/:slug
GET   /api/v1/admin/areas?limit=20&cursor=
POST  /api/v1/admin/areas
PATCH /api/v1/admin/areas/:id
PATCH /api/v1/admin/areas/:id/publish
PATCH /api/v1/admin/areas/:id/unpublish
```

Implementation steps:

1. Add `Area` model va migration.
2. Validate:
   - name 1-150.
   - slug lowercase kebab-case, unique.
   - provinceCode lowercase short code, optional.
   - centerLat between -90 and 90.
   - centerLng between -180 and 180.
   - defaultRadiusKm > 0 va <= 100.
3. Public APIs chi tra `published = true`.
4. Admin APIs tra ca draft/published.
5. Admin create/update duoc center lat/lng do frontend lay tu click tren map.
6. Publish/unpublish chi update flag, khong xoa data.
7. Add Swagger docs.

Acceptance criteria:

- Admin tao/sua area duoc.
- Slug unique.
- Public area detail chi tra area published.
- Area unpublished khong hien public.
- Khong goi geocoding/map paid API.
- API admin yeu cau JWT role ADMIN/SUPER_ADMIN.
- Public response du de WebApp route `/:provinceCode/:areaSlug` load area.

Scale-later notes:

- Sau nay co the them bounds/boundary GeoJSON vao Area neu can map fit bounds chinh xac.
- Sau nay co the them `area_admins` de phan quyen admin theo khu vuc.

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

- Tao schema place co du field cho WebApp admin dang dia danh, public map va chuan bi itinerary sau nay.

Dependencies:

- P4-T01.
- P4-T00.

Model:

```txt
Place
- id uuid
- areaId nullable
- name
- slug unique
- summary nullable
- description nullable
- localTip nullable
- bestTime nullable
- priceRange nullable
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
- coverUrl nullable
- videoUrl nullable
- audioUrl nullable
- sortOrder int default 0
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
   - areaId + sortOrder.
   - categoryId.
   - provinceCode.
   - status + createdAt.
   - latitude/longitude simple indexes if useful.
4. Migration.

Acceptance criteria:

- Place luu duoc lat/lng.
- Place co cost/duration optional fields de dung sau.
- Slug unique.
- Place co du fields WebApp can: summary, localTip, bestTime, priceRange, coverUrl, media URLs.
- Place co the thuoc mot area.

Notes:

- Chua bat buoc PostGIS o free MVP de giam complexity. Co the them sau neu nearby query can chinh xac hon.
- `lat/lng` bat buoc cho place published vi public map can marker.
- Chua can PostGIS/paid geocoding. Sau nay co user that moi them PostGIS hoac routing service.

## P4-T03 - Create/update place API

Objective:

- Admin tao/sua dia danh voi ten, dia chi, lat/lng, noi dung editorial va trang thai publish.

Dependencies:

- P4-T02.
- P1-T06.
- P4-T00.
- P5-T04.

APIs:

```txt
POST  /api/v1/admin/places
PATCH /api/v1/admin/places/:id
PATCH /api/v1/admin/places/:id/publish
PATCH /api/v1/admin/places/:id/unpublish
```

Implementation steps:

1. Tao `PlacesModule`.
2. Tao DTO create/update.
3. Validate:
   - name 1-150.
   - summary max 500.
   - description max 10000.
   - localTip max 1000.
   - bestTime max 500.
   - priceRange max 100.
   - address max 500.
   - lat between -90 and 90.
   - lng between -180 and 180.
   - estimated costs >= 0.
   - estimatedMinCost <= estimatedMaxCost.
   - averageVisitDurationMinutes reasonable, e.g. 15-1440.
   - coverUrl/videoUrl/audioUrl valid URL hoac internal path theo convention.
4. Generate slug from name.
5. Handle duplicate slug by suffix short id.
6. Restrict create/update to ADMIN/SUPER_ADMIN for MVP.
7. Validate area exists neu `areaId` provided.
8. Publish chi cho phep khi place co `name`, `category`, `lat`, `lng`, `areaId`.
9. Return place detail.

Acceptance criteria:

- Admin tao place duoc.
- User thuong tra 403.
- Invalid lat/lng tra 400.
- Duplicate name khong lam crash slug.
- Place draft co the thieu media/content phu.
- Place published bat buoc co toa do de public map render marker.
- Publish/unpublish khong xoa data.
- API admin yeu cau JWT role ADMIN/SUPER_ADMIN.
- Khong goi paid geocoding/map API trong create/update/publish.

Scale-later notes:

- Sau nay co the them moderation approval flow neu cho user submit place.
- Sau nay co the them geocoding provider optional qua abstraction, disabled mac dinh o Level 0.

## P4-T04 - Place detail/list APIs

Objective:

- User browse va xem chi tiet place; WebApp public map lay places theo area.

Dependencies:

- P4-T03.

APIs:

```txt
GET /api/v1/places
GET /api/v1/places/:id
GET /api/v1/places/slug/:slug
GET /api/v1/areas/:areaSlug/places
```

List query params:

```txt
q
areaSlug
areaId
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
4. Filter area/category/province/price.
5. Cursor pagination.
6. Sort `sortOrder asc`, then newest/rating tuy endpoint.
7. Detail include category.
8. Area places endpoint can return compact marker fields:
   - id, name, slug, category, summary, lat, lng, coverUrl, bestTime, localTip.

Acceptance criteria:

- Public user browse places.
- Hidden/draft khong hien public.
- Filter category/province works.
- Public map lay duoc published places theo `areaSlug`.
- Response co lat/lng cho marker.
- Limit max 50.
- Response compact co the map sang `Place` type trong `TravelSocialWebApp/src/data/mockPlaces.ts`.

Scale-later notes:

- Khi traffic tang, them cache/CDN cho public area/places response.
- Khi data lon, them PostGIS index/nearby endpoint rieng.

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

## P4-T06A - Admin place images and external media URLs

Objective:

- Ho tro admin gan anh gallery va URL media ngoai vao dia danh theo data model WebApp ma khong ton chi phi storage server.

Dependencies:

- P4-T03.
- P2-T01 optional neu da co MediaAsset; neu chua co, dung URL fields truoc.

Model:

```txt
PlaceImage
- id uuid
- placeId
- imageUrl
- caption nullable
- sortOrder int default 0
- createdAt
```

APIs:

```txt
GET    /api/v1/places/:id/images
POST   /api/v1/admin/places/:id/images
PATCH  /api/v1/admin/places/:id/images/:imageId
DELETE /api/v1/admin/places/:id/images/:imageId
PATCH  /api/v1/admin/places/:id/media-links
```

Implementation steps:

1. Add `PlaceImage` model va migration.
2. Validate `imageUrl` la URL hoac internal public path theo convention.
3. Validate caption max 300.
4. Validate sortOrder >= 0.
5. Media links endpoint update:
   - coverUrl
   - videoUrl
   - audioUrl
6. Khuyen nghi MVP:
   - videoUrl uu tien YouTube/Vimeo/public URL.
   - audioUrl optional external/public URL.
   - upload file truc tiep de Phase 2 Media/R2, khong upload binary trong Places API.
7. Public place detail include gallery sorted by sortOrder.

Acceptance criteria:

- Admin them/sua/xoa image URL cho place duoc.
- Public place detail tra gallery.
- Backend khong proxy/upload binary media trong task nay.
- Video upload truc tiep khong nam trong MVP chi phi 0.

Scale-later notes:

- Sau nay khi Phase 2 Media/R2 xong, `imageUrl` co the tro toi R2 public URL.
- Neu can upload file, implement qua presigned R2 upload, khong upload binary qua Places API.

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
