# Task Index - Backend Travel Social Service

Thu muc nay chua cac task thi cong chi tiet cho backend. Moi task duoc viet theo format de AI agent hoac developer co the nhan viec doc lap.

## Nguyen tac giao task cho agent

- Moi agent chi nen nhan 1 task hoac 1 nhom task nho co cung module.
- Agent phai doc `docs/backend-architecture-plan.md` truoc khi code.
- Agent khong duoc thay doi architecture neu task khong yeu cau.
- Agent khong duoc them Redis, Kafka, OpenSearch, Kubernetes trong MVP.
- Agent phai giu muc tieu chi phi ban dau bang 0 USD.
- Level 0 mac dinh la: Render Free API, Supabase Free Postgres, Cloudflare R2 Free, Cloudflare/Vercel/Pages Free.
- Agent khong duoc yeu cau VPS, managed paid database, paid queue, paid search, paid map API hoac paid email provider trong cac phase MVP.
- Neu mot task can chuc nang co the ton tien, agent phai implement abstraction/config truoc va de feature disabled/fallback free.
- Agent phai viet code theo NestJS modular monolith.
- Moi API list phai co pagination neu danh sach co the lon.
- Moi thay doi database phai co Prisma migration.
- Moi endpoint protected phai co auth/role guard phu hop.
- Moi task phai cap nhat Swagger/OpenAPI neu them/sua API.

## Thu tu thi cong khuyen nghi

1. [Phase 0 - Foundation](./phase-0-foundation.md)
2. [Phase 1 - Auth and Users](./phase-1-auth-users.md)
3. [Phase 2 - Media and Posts](./phase-2-media-posts.md)
4. [Phase 3 - Social Graph and Feed](./phase-3-social-feed.md)
5. [Phase 4 - Places, Reviews, Search](./phase-4-places-reviews-search.md)
6. [Phase 5 - Notifications, Admin, Deployment](./phase-5-notifications-admin-deploy.md)
7. [Phase 6 - Future Itinerary Preparation](./phase-6-future-itinerary-prep.md)

## MVP path - Admin dang dia danh va client load public map

Neu muc tieu truoc mat la admin dang thong tin dia danh va client load ve ban do public, khong can lam het roadmap. Lam dung cac task sau:

```txt
1. Phase 0 full - Foundation
2. P1-T01 - User and auth database schema
3. P1-T02 - Register API
4. P1-T03 - Login API
5. P1-T04 - Refresh token rotation
6. P1-T05 - Logout API
7. P1-T06 - JWT auth guard and CurrentUser decorator
8. P1-T10 - Seed first admin user for free MVP
9. P5-T04 - Role guard
10. P4-T00 - Area schema and admin CRUD
11. P4-T01 - Place category schema and seed
12. P4-T02 - Place schema with future itinerary fields
13. P4-T03 - Create/update/publish place API
14. P4-T04 - Public area/place list APIs
15. P4-T06A - Admin place images and external media URLs
```

Can tam hoan:

```txt
Phase 2 Media upload
Phase 3 Social/feed
Reviews
Advanced search
Realtime notifications
Itinerary/recommendation
```

Cost rule cho MVP path:

- Auth tu host trong NestJS + PostgreSQL, khong dung paid auth provider.
- Admin media truoc mat dung URL ngoai hoac public path, chua upload binary.
- Backend khong goi paid geocoding/map API.
- Client lay toa do tu MapLibre click hoac admin nhap lat/lng.
- Deploy Level 0 van la Render Free + Supabase Free Postgres + Cloudflare/Vercel/Pages Free.

## Frontend compatibility notes

Backend tasks must stay compatible with `/Users/hungvovan/Documents/OfMe/TravelSocialWebApp`:

- WebApp public route uses `/:provinceCode/:areaSlug`.
- WebApp map needs published `areas` and published `places` with `lat/lng`.
- Admin needs to create/edit/publish places with name, address, lat/long, category, description, local tip, best time, price range, cover/media URLs.
- Keep map/geocoding cost at 0 USD: admin selects coordinates in MapLibre or enters lat/lng manually; backend must not require paid geocoding.

## Definition of Ready

Mot task san sang thi cong khi:

- Task co id ro rang.
- Dependency da hoan thanh.
- Data model can thiet da duoc mo ta.
- API contract da duoc mo ta.
- Acceptance criteria ro.
- Test case toi thieu ro.

## Definition of Done

Mot task hoan thanh khi:

- Code build thanh cong.
- Lint/format pass neu project co script.
- Test lien quan pass neu project co test setup.
- Prisma migration duoc tao neu co doi schema.
- Swagger docs cap nhat.
- `.env.example` cap nhat neu them env.
- Khong hard-code secret.
- Khong luu media vao local disk.
- Khong dung service paid-only cho MVP.
- Khong dua paid infrastructure vao path bat buoc de chay app.
- Cac module phai dung config/env va abstraction de sau nay nang cap infrastructure khong phai viet lai business logic.
- Agent ghi lai cac file da thay doi va cach verify.

## Naming convention

Task id:

```txt
P<phase>-T<task_number>
```

Vi du:

```txt
P0-T01 - Initialize NestJS project
P1-T03 - Login API
P4-T05 - Attach place to post
```
