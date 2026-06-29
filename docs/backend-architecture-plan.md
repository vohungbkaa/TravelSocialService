# Backend Architecture Plan - Mang xa hoi Du lich dia phuong

## 1. Muc tieu san pham

He thong la mot mang xa hoi tap trung vao trai nghiem du lich dia phuong. Nguoi dung co the chia se bai viet, anh, video, review dia diem, theo doi nguoi khac, tim kiem dia diem, xem feed theo so thich va vi tri, luu bai viet, binh luan, nhan thong bao va ve sau co the ket noi voi local guide, partner, tour hoac booking.

Muc tieu kien truc giai doan dau:

- Chi phi van hanh thap nhat co the.
- Ra MVP nhanh de validate nhu cau nguoi dung.
- Codebase co cau truc sach de scale sau nay.
- Khong dung microservices qua som.
- Khong dua cac thanh phan dat tien nhu Kafka, Kubernetes, Elasticsearch ngay tu dau.
- Uu tien PostgreSQL, Cloudflare R2 va mot backend modular monolith.

## 2. Nguyen tac kien truc

### 2.1. Modular monolith truoc, microservices sau

Giai doan dau chi deploy mot backend NestJS duy nhat. Ben trong backend chia module ro rang theo domain:

- `auth`
- `users`
- `profiles`
- `posts`
- `comments`
- `reactions`
- `follows`
- `places`
- `reviews`
- `media`
- `feed`
- `notifications`
- `search`
- `admin`

Moi module co controller, service, repository va DTO rieng. Neu sau nay can tach service, cac boundary da co san.

### 2.2. Toi uu cho toc do hoc thi truong

Tai thoi diem chua biet co user hay khong, khong can build he thong qua phuc tap. Cac quyet dinh nen uu tien:

- Lam du dung, de sua.
- Khong over-engineer.
- Chi them cache, queue, search engine khi co dau hieu can thiet.
- Giu data model chat vi sua database sau nay ton chi phi hon sua code.

### 2.3. Database la trung tam o MVP

PostgreSQL se xu ly phan lon nhu cau:

- Transaction.
- Relationship.
- Pagination.
- Search co ban.
- Ranking feed co ban.
- Geo query voi PostGIS neu can.

Redis, OpenSearch, Kafka chi la thanh phan tang cuong sau nay.

### 2.4. Media khong luu tren server

Anh va video khong duoc luu truc tiep trong VPS hay PostgreSQL. Dung object storage:

- Cloudflare R2 cho chi phi thap.
- Presigned URL de client upload truc tiep.
- PostgreSQL chi luu metadata.

### 2.5. API-first

Backend cung cap REST API kem Swagger/OpenAPI. Mobile app, web app va admin portal deu tich hop qua API.

## 3. Stack de xuat

### 3.1. Giai doan MVP chi phi thap

```txt
Language: TypeScript
Framework: NestJS
Runtime: Node.js LTS
Database: PostgreSQL
ORM: Prisma
Storage: Cloudflare R2
Search: PostgreSQL full-text search
Cache: Chua dung ban dau
Queue: Chua dung ban dau hoac in-process job don gian
API: REST + Swagger
Deploy: Docker Compose tren VPS nho hoac Render free de demo
Logging: Pino
Validation: class-validator hoac Zod
Auth: JWT access token + refresh token
```

### 3.2. Khi co traction

```txt
Cache: Redis
Queue: BullMQ + Redis
Search: OpenSearch
Realtime: Socket.IO + Redis adapter
Monitoring: Sentry + Prometheus/Grafana
Database: Managed PostgreSQL
```

### 3.3. Khi scale lon

```txt
Feed service: co the tach sang Go hoac Node worker rieng
Notification service: worker rieng
Media processing: worker rieng
Chat gateway: service rieng
Event streaming: Kafka hoac NATS
Deployment: Kubernetes hoac ECS/GKE tuy team
```

## 4. Kien truc tong the

## 4.0. Kien truc thi cong ban dau voi chi phi 0 USD/thang

Muc tieu ban dau la chay duoc MVP public/deploy demo voi chi phi ha tang bang 0 hoac gan 0, chap nhan cac gioi han cua free tier. Kien truc code van phai duoc thiet ke nhu production nho de sau nay nang cap khong phai viet lai.

### 4.0.1. Stack 0 USD khuyen nghi

```txt
Frontend/Web Admin: Vercel Free hoac Cloudflare Pages Free
Backend API: Render Free Web Service
Database: Supabase Free Postgres
Media Storage: Cloudflare R2 Free tier
DNS/CDN: Cloudflare Free
Email: Chua dung o MVP hoac dung provider free tier sau
Monitoring: Log cua platform + Sentry Free neu can
```

Ly do chon nhu tren:

- Backend van la NestJS nen sau nay deploy o dau cung duoc.
- Database van la PostgreSQL nen co the migrate tu Supabase sang managed Postgres/VPS/RDS ma khong doi data model lon.
- Media dung S3-compatible Cloudflare R2 nen sau nay co the doi sang S3/MinIO/R2 paid ma chi doi config.
- Khong dung Firebase lock-in cho core database.
- Khong can Redis, OpenSearch, Kafka hay Kubernetes luc dau.

### 4.0.2. So do 0 USD

```txt
Mobile/Web Client
    |
    | HTTPS
    v
Cloudflare DNS/CDN Free
    |
    +----------------------+
    |                      |
    v                      v
Vercel/Pages Free     Render Free API
                           |
                           v
                    Supabase Free Postgres
                           |
                           v
                    Cloudflare R2 Free
```

### 4.0.3. Gioi han chap nhan o giai doan 0 USD

Kien truc 0 USD chi dung de validate san pham, khong nen xem la production nghiem tuc.

Gioi han co the gap:

- Backend free co the cold start hoac sleep.
- CPU/RAM thap.
- Database free gioi han dung luong, connection va project activity.
- Khong co SLA tot.
- Background job dai khong phu hop.
- Log/monitoring bi gioi han.
- Neu media tang nhanh se cham cham free tier storage/operation.

Chap nhan cac gioi han nay vi muc tieu la kiem chung:

- Co user dang ky khong.
- Co user tao bai viet khong.
- Co user xem/feed/review dia diem khong.
- Noi dung du lich dia phuong co tao duoc retention khong.

### 4.0.4. Nguyen tac de sau nay de nang cap

De dam bao tu 0 USD nang cap len ha tang tra phi de dang, can tuan thu cac rule sau ngay tu dau:

```txt
Khong viet SQL gan chat voi Supabase-specific feature neu khong can.
Khong dung Supabase Auth cho core auth neu muon giu backend portable.
Khong luu file trong local disk cua Render.
Khong hard-code public URL cua storage trong business logic.
Khong goi truc tiep R2 tu cac module khac; chi goi qua Media/StorageService.
Khong de frontend truy cap database truc tiep.
Tat ca business rule nam trong NestJS backend.
Moi config di qua environment variables.
Moi danh sach lon phai co pagination.
Moi query feed/search phai co index ngay tu dau.
```

### 4.0.5. Upgrade path khong viet lai

Nang cap theo tung muc:

```txt
Level 0 - Free validation
Render Free API + Supabase Free Postgres + R2 Free

Level 1 - MVP public on dinh hon
Render Starter hoac VPS 5-10 USD/thang
Van giu Supabase Postgres hoac chuyen Postgres ve VPS

Level 2 - Co user that
Managed Postgres paid
API paid instance
Backup tu dong
Sentry

Level 3 - Co traffic
Them Redis
Them worker rieng
Them queue BullMQ
Toi uu feed/search

Level 4 - Scale lon
Tach feed/media/notification service
Them OpenSearch neu search PostgreSQL khong du
Them realtime gateway rieng neu chat/notification tang
```

Quan trong: Level 0 den Level 2 chi nen la thay doi infrastructure va environment variables. Code backend khong nen phai viet lai.

### 4.1. MVP deployment

```txt
Client Web/Mobile
    |
    | HTTPS
    v
Cloudflare DNS/CDN
    |
    v
VPS / Render
    |
    +-- NestJS API
    +-- PostgreSQL
    +-- optional in-process worker
    |
    v
Cloudflare R2
```

### 4.2. Production nho

```txt
Client Web/Mobile
    |
Cloudflare
    |
Load Balancer / Reverse Proxy
    |
NestJS API instances
    |
    +-- Managed PostgreSQL
    +-- Redis
    +-- Worker process
    +-- Cloudflare R2
```

### 4.3. Production lon sau nay

```txt
Clients
  |
API Gateway
  |
  +-- Core API
  +-- Feed Service
  +-- Notification Service
  +-- Media Worker
  +-- Search Indexer
  +-- Chat Gateway
  |
  +-- PostgreSQL
  +-- Redis
  +-- OpenSearch
  +-- Object Storage
  +-- Message Broker
```

## 5. Domain modules

### 5.1. Auth module

Trach nhiem:

- Dang ky.
- Dang nhap.
- Dang xuat.
- Refresh token.
- Doi mat khau.
- Quen mat khau.
- Xac thuc email sau nay.
- OAuth Google/Facebook/Apple sau nay.

Bang lien quan:

- `users`
- `auth_accounts`
- `refresh_tokens`

API ban dau:

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### 5.2. Users/Profile module

Trach nhiem:

- Quan ly thong tin user.
- Profile cong khai.
- Avatar, bio, home location.
- Thong ke follower/following/post count.

Bang lien quan:

- `users`
- `user_profiles`
- `follows`

API ban dau:

```txt
GET   /users/:id
GET   /users/username/:username
PATCH /users/me/profile
POST  /users/me/avatar
```

### 5.3. Places module

Trach nhiem:

- Quan ly dia diem du lich dia phuong.
- Category dia diem.
- Thong tin tinh/thanh, quan/huyen.
- Toa do dia ly.
- Anh dai dien dia diem.
- Review/rating tong hop.

Bang lien quan:

- `places`
- `place_categories`
- `place_photos`
- `place_reviews`
- `provinces`
- `districts`
- `wards`

API ban dau:

```txt
GET  /places
GET  /places/:id
GET  /places/slug/:slug
GET  /places/nearby
POST /places
PATCH /places/:id
```

### 5.4. Posts module

Trach nhiem:

- Tao bai viet.
- Sua/xoa bai viet.
- Gan dia diem.
- Gan media.
- Hashtag.
- Trang thai visibility.

Bang lien quan:

- `posts`
- `post_media`
- `post_places`
- `post_hashtags`
- `hashtags`

API ban dau:

```txt
POST   /posts
GET    /posts/:id
PATCH  /posts/:id
DELETE /posts/:id
GET    /users/:id/posts
GET    /places/:id/posts
```

### 5.5. Comments module

Trach nhiem:

- Binh luan bai viet.
- Reply comment cap 1.
- Sua/xoa comment.
- Dem so comment.

Bang lien quan:

- `comments`

API ban dau:

```txt
POST   /posts/:postId/comments
GET    /posts/:postId/comments
PATCH  /comments/:id
DELETE /comments/:id
```

### 5.6. Reactions module

Trach nhiem:

- Like/unlike bai viet.
- Like/unlike comment sau nay.
- Dem reaction.

Bang lien quan:

- `post_reactions`
- `comment_reactions`

API ban dau:

```txt
POST   /posts/:postId/reactions
DELETE /posts/:postId/reactions
```

### 5.7. Follows module

Trach nhiem:

- Follow user.
- Unfollow user.
- Danh sach follower/following.
- Block user sau nay.

Bang lien quan:

- `follows`
- `blocks`

API ban dau:

```txt
POST   /users/:id/follow
DELETE /users/:id/follow
GET    /users/:id/followers
GET    /users/:id/following
```

### 5.8. Feed module

Trach nhiem:

- Tao home feed.
- Tao place feed.
- Tao explore feed.
- Ranking bai viet co ban.

Ban dau khong can bang `feeds`. Query truc tiep tu PostgreSQL.

API ban dau:

```txt
GET /feed/home
GET /feed/explore
GET /feed/nearby
```

### 5.9. Media module

Trach nhiem:

- Tao presigned upload URL.
- Luu metadata file.
- Gan media vao post/place/profile.
- Validate file type va size.

Bang lien quan:

- `media_assets`

API ban dau:

```txt
POST /media/presigned-upload
POST /media/confirm-upload
GET  /media/:id
```

### 5.10. Notifications module

Trach nhiem:

- Tao notification khi co like/comment/follow.
- Danh sach notification.
- Mark as read.

Bang lien quan:

- `notifications`

API ban dau:

```txt
GET   /notifications
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

### 5.11. Search module

Trach nhiem:

- Search user.
- Search place.
- Search post.
- Search hashtag.

Ban dau dung PostgreSQL full-text search va trigram index neu can.

API ban dau:

```txt
GET /search?q=
GET /search/users?q=
GET /search/places?q=
GET /search/posts?q=
```

### 5.12. Admin module

Trach nhiem:

- Quan ly user.
- Quan ly place.
- Quan ly report.
- An/xoa noi dung vi pham.
- Audit action.

Bang lien quan:

- `reports`
- `moderation_actions`
- `audit_logs`

API ban dau:

```txt
GET   /admin/users
GET   /admin/posts
PATCH /admin/posts/:id/hide
GET   /admin/reports
PATCH /admin/reports/:id/resolve
```

## 6. Data model MVP

### 6.1. Users

```txt
users
- id uuid pk
- email varchar unique nullable
- phone varchar unique nullable
- username varchar unique not null
- password_hash varchar nullable
- status enum(active, suspended, deleted)
- role enum(user, admin, super_admin)
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz nullable
```

### 6.2. User profiles

```txt
user_profiles
- user_id uuid pk fk users.id
- display_name varchar
- bio text nullable
- avatar_media_id uuid nullable
- cover_media_id uuid nullable
- home_province_id uuid nullable
- website_url varchar nullable
- post_count int default 0
- follower_count int default 0
- following_count int default 0
- created_at timestamptz
- updated_at timestamptz
```

### 6.3. Auth accounts

```txt
auth_accounts
- id uuid pk
- user_id uuid fk users.id
- provider enum(local, google, facebook, apple)
- provider_user_id varchar nullable
- email varchar nullable
- created_at timestamptz
```

### 6.4. Refresh tokens

```txt
refresh_tokens
- id uuid pk
- user_id uuid fk users.id
- token_hash varchar
- expires_at timestamptz
- revoked_at timestamptz nullable
- created_at timestamptz
```

### 6.5. Places

```txt
places
- id uuid pk
- name varchar
- slug varchar unique
- description text nullable
- category_id uuid fk place_categories.id
- address text nullable
- province_id uuid nullable
- district_id uuid nullable
- ward_id uuid nullable
- latitude decimal nullable
- longitude decimal nullable
- geo_point geography(Point) nullable
- rating_avg decimal default 0
- rating_count int default 0
- post_count int default 0
- status enum(draft, published, hidden)
- created_by uuid nullable
- created_at timestamptz
- updated_at timestamptz
```

### 6.6. Posts

```txt
posts
- id uuid pk
- author_id uuid fk users.id
- content text
- visibility enum(public, followers, private)
- status enum(published, hidden, deleted)
- primary_place_id uuid nullable
- like_count int default 0
- comment_count int default 0
- save_count int default 0
- share_count int default 0
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz nullable
```

### 6.7. Media assets

```txt
media_assets
- id uuid pk
- owner_id uuid fk users.id
- bucket varchar
- object_key varchar unique
- public_url text
- mime_type varchar
- size_bytes bigint
- width int nullable
- height int nullable
- duration_seconds int nullable
- media_type enum(image, video)
- status enum(pending, uploaded, failed, deleted)
- created_at timestamptz
```

### 6.8. Post media

```txt
post_media
- id uuid pk
- post_id uuid fk posts.id
- media_id uuid fk media_assets.id
- sort_order int
- created_at timestamptz
```

### 6.9. Comments

```txt
comments
- id uuid pk
- post_id uuid fk posts.id
- author_id uuid fk users.id
- parent_id uuid nullable fk comments.id
- content text
- status enum(published, hidden, deleted)
- like_count int default 0
- created_at timestamptz
- updated_at timestamptz
- deleted_at timestamptz nullable
```

### 6.10. Follows

```txt
follows
- follower_id uuid fk users.id
- following_id uuid fk users.id
- created_at timestamptz
- unique(follower_id, following_id)
```

### 6.11. Post reactions

```txt
post_reactions
- user_id uuid fk users.id
- post_id uuid fk posts.id
- reaction_type enum(like)
- created_at timestamptz
- unique(user_id, post_id)
```

### 6.12. Saved posts

```txt
saved_posts
- user_id uuid fk users.id
- post_id uuid fk posts.id
- created_at timestamptz
- unique(user_id, post_id)
```

### 6.13. Notifications

```txt
notifications
- id uuid pk
- recipient_id uuid fk users.id
- actor_id uuid nullable fk users.id
- type enum(follow, post_like, post_comment, comment_reply, system)
- entity_type varchar nullable
- entity_id uuid nullable
- data jsonb
- read_at timestamptz nullable
- created_at timestamptz
```

## 7. Index strategy

Can tao index ngay tu dau cho cac query chinh:

```txt
users.username unique
users.email unique
posts.author_id, posts.created_at desc
posts.primary_place_id, posts.created_at desc
posts.status, posts.created_at desc
comments.post_id, comments.created_at desc
follows.follower_id
follows.following_id
post_reactions.post_id
post_reactions.user_id
notifications.recipient_id, notifications.created_at desc
places.slug unique
places.category_id
places.province_id
```

Neu dung search PostgreSQL:

```txt
places.name gin/trigram
posts.content full-text
users.username trigram
user_profiles.display_name trigram
```

## 8. API conventions

### 8.1. Versioning

Dung prefix:

```txt
/api/v1
```

Vi du:

```txt
GET /api/v1/feed/home
```

### 8.2. Response format

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found",
    "details": {}
  }
}
```

### 8.3. Pagination

Dung cursor pagination cho feed va danh sach lon:

```txt
GET /feed/home?limit=20&cursor=...
```

Response:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "..."
  }
}
```

### 8.4. Auth

```txt
Authorization: Bearer <access_token>
```

Access token ngan han:

```txt
15 phut - 1 gio
```

Refresh token dai hon:

```txt
7 - 30 ngay
```

Refresh token phai duoc hash trong database.

## 9. Feed MVP

### 9.1. Home feed

Ban dau query:

```txt
Lay bai viet public cua:
- user dang follow
- chinh user
- mot so bai viet public moi nhat
Sap xep theo created_at desc va score don gian
```

### 9.2. Explore feed

Query:

```txt
Bai viet public
Trang thai published
Trong 7-30 ngay gan day
Score dua tren like_count, comment_count, save_count va recency
```

Score tam thoi:

```txt
score = like_count * 2
      + comment_count * 3
      + save_count * 4
      + recency_score
```

### 9.3. Nearby feed

Neu user co vi tri:

```txt
Lay places trong ban kinh X km
Lay posts gan cac places do
Sap xep theo recency va engagement
```

## 10. Media flow

### 10.1. Upload anh

```txt
1. Client goi POST /media/presigned-upload
2. Backend validate mime type, file size, owner
3. Backend tao media_assets status pending
4. Backend tra ve presigned URL
5. Client upload truc tiep len Cloudflare R2
6. Client goi POST /media/confirm-upload
7. Backend check object ton tai neu co the
8. Backend update status uploaded
9. Post creation gan media_id vao post_media
```

### 10.2. Gioi han MVP

Ban dau:

```txt
Image only
Toi da 5 anh / post
Toi da 5MB / anh
Mime type: image/jpeg, image/png, image/webp
```

Video nen de phase sau vi can transcode, thumbnail va storage lon.

## 11. Security

### 11.1. Bat buoc tu MVP

- Hash password bang Argon2 hoac bcrypt.
- Validate DTO tat ca input.
- Rate limit login/register/upload.
- JWT guard cho API can auth.
- Role guard cho admin.
- Khong tra password hash/token ra response.
- Soft delete user-generated content.
- Kiem tra ownership khi sua/xoa post/comment/media.
- Gioi han file upload.
- CORS whitelist theo environment.
- Helmet.
- Request id.
- Log error nhung khong log secret.

### 11.2. Nen co trong phase 2

- Email verification.
- Password reset.
- Report content.
- Admin moderation.
- Audit log.
- Device/session management.
- Token reuse detection.

## 12. Cost control

### 12.1. Giai doan demo

```txt
Target cost: 0 USD / thang
```

Dung:

- Render free hoac Railway trial cho API.
- Supabase/Render Postgres free cho DB demo.
- Cloudflare R2 free tier cho media.

Rui ro:

- Cold start.
- Gioi han database.
- Khong on dinh cho production.

### 12.2. Giai doan MVP public nho

```txt
Target cost: 5-10 USD / thang
```

Dung:

- 1 VPS nho.
- Docker Compose.
- PostgreSQL trong VPS.
- Cloudflare R2.
- Cloudflare DNS/CDN.

### 12.3. Giai doan co user that

```txt
Target cost: 20-50 USD / thang
```

Dung:

- Managed PostgreSQL.
- API service rieng.
- Redis neu can cache/queue.
- Backup tu dong.
- Sentry.

## 13. Roadmap tong the

### Phase 0 - Foundation

Muc tieu: Khoi tao backend chuan, co auth, database, config va API docs.

Ket qua:

- NestJS project.
- PostgreSQL ket noi qua Prisma.
- Auth co register/login.
- Swagger.
- Docker Compose local.
- Health check.

### Phase 1 - Social MVP

Muc tieu: User co the tao profile, dang bai, upload anh, follow, like, comment va xem feed.

Ket qua:

- User profile.
- Media upload R2.
- Post CRUD.
- Like/comment.
- Follow.
- Home feed co ban.

### Phase 2 - Travel MVP

Muc tieu: Them dia diem du lich va gan bai viet vao dia diem.

Ket qua:

- Places.
- Place categories.
- Reviews.
- Search co ban.
- Place feed.
- Nearby API neu co toa do.

### Phase 3 - Trust & Admin

Muc tieu: Quan ly noi dung va nguoi dung.

Ket qua:

- Admin APIs.
- Report content.
- Moderation actions.
- Audit log.
- Notification stored.

### Phase 4 - Growth

Muc tieu: Cai thien trai nghiem social va scale vua phai.

Ket qua:

- Redis cache.
- BullMQ jobs.
- Realtime notification.
- Better feed ranking.
- Search engine neu can.

### Phase 5 - Smart itinerary recommendation

Muc tieu: Goi y lo trinh kham pha dia phuong dua tren noi dung user da chia se, review, dia diem pho bien, ngan sach va thoi gian cua nguoi dung.

Day la tinh nang thi cong sau, khong nam trong MVP. Tuy nhien cac module MVP can luu du lieu dung format de sau nay co the xay recommendation ma khong phai migrate lon.

Ket qua mong muon:

- Goi y lich trinh 1 ngay, 2 ngay, 3 ngay theo dia diem.
- Goi y route theo chu de: an uong, cafe, song ao, thien nhien, van hoa, local hidden gems.
- Goi y theo ngan sach: tiet kiem, can bang, thoai mai.
- Goi y theo thoi gian ranh: nua ngay, 1 ngay, cuoi tuan.
- Goi y dua tren bai viet va review cua user that.
- Uoc tinh chi phi: di chuyen, an uong, ve vao cong, trai nghiem.
- Uoc tinh thoi gian di chuyen va thoi gian trai nghiem.
- Cho phep user luu, sua, chia se itinerary.

## 13A. Phan tich tinh nang goi y lo trinh kham pha

### 13A.1. Vi tri cua tinh nang trong san pham

Tinh nang goi y lo trinh kham pha khong nen lam ngay tu dau vi phu thuoc vao du lieu thuc:

- Can co du places.
- Can co du posts gan voi places.
- Can co review/rating.
- Can co engagement: like, save, comment.
- Can co thong tin chi phi uoc tinh cua dia diem.
- Can co toa do dia ly de tinh khoang cach.
- Can co hanh vi nguoi dung de ca nhan hoa.

Neu lam qua som, recommendation se la rule-based rong, thieu tin cay va ton thoi gian. MVP nen tap trung thu thap dung loai du lieu truoc.

### 13A.2. Cac module lien quan

Tinh nang nay phu thuoc vao cac module:

```txt
places
posts
post_places
reviews
media
reactions
saved_posts
follows
feed
search
user_preferences
itineraries
cost_estimates
transport_options
recommendation
analytics_events
```

Trong do:

- `places`: nguon dia diem co toa do, category, rating, price level.
- `posts`: nguon chia se trai nghiem thuc cua user.
- `reviews`: nguon chat luong va do tin cay cua dia diem.
- `reactions/saved_posts`: tin hieu dia diem/bai viet nao dang duoc quan tam.
- `user_preferences`: so thich ca nhan cua user.
- `cost_estimates`: du lieu gia uoc tinh.
- `transport_options`: cach di chuyen va chi phi di chuyen.
- `itineraries`: lich trinh da generate, da luu, da chia se.
- `analytics_events`: hanh vi click, save, skip, complete itinerary.

### 13A.3. Du lieu can thu thap tu MVP de ho tro recommendation sau nay

Ngay tu MVP nen luu cac field sau, du chua dung het:

Places:

```txt
places.latitude
places.longitude
places.category_id
places.province_id
places.district_id
places.rating_avg
places.rating_count
places.post_count
places.price_level nullable
places.estimated_min_cost nullable
places.estimated_max_cost nullable
places.average_visit_duration_minutes nullable
places.opening_hours jsonb nullable
```

Posts:

```txt
posts.primary_place_id
posts.created_at
posts.like_count
posts.comment_count
posts.save_count
```

Reviews:

```txt
place_reviews.rating
place_reviews.content
place_reviews.visit_date nullable
place_reviews.cost_per_person nullable
place_reviews.visit_duration_minutes nullable
```

User signals:

```txt
saved_posts
post_reactions
follows
search_history optional
place_views optional
itinerary_saves future
```

Neu chua muon lam `analytics_events` ngay, co the de phase sau. Nhung data model nen chuan bi de them khong pha vo.

### 13A.4. Data model bo sung sau nay

Khi thi cong tinh nang itinerary, them cac bang sau:

```txt
user_preferences
- user_id uuid pk
- preferred_categories jsonb
- preferred_budget_level enum(low, medium, high) nullable
- preferred_trip_pace enum(relaxed, balanced, packed) nullable
- avoid_categories jsonb nullable
- updated_at timestamptz

place_cost_profiles
- place_id uuid pk
- min_cost_per_person int nullable
- max_cost_per_person int nullable
- typical_cost_per_person int nullable
- currency varchar default 'VND'
- source enum(admin, user_review, estimated)
- updated_at timestamptz

transport_edges
- id uuid pk
- from_place_id uuid
- to_place_id uuid
- distance_meters int nullable
- duration_minutes int nullable
- estimated_cost int nullable
- transport_mode enum(walking, motorbike, car, taxi, public_transport)
- source enum(estimated, map_provider, admin)
- updated_at timestamptz

itineraries
- id uuid pk
- owner_id uuid nullable
- title varchar
- province_id uuid nullable
- start_place_id uuid nullable
- budget_min int nullable
- budget_max int nullable
- total_estimated_cost int nullable
- total_duration_minutes int nullable
- visibility enum(private, public, shared)
- source enum(user_created, system_generated)
- created_at timestamptz
- updated_at timestamptz

itinerary_items
- id uuid pk
- itinerary_id uuid
- place_id uuid
- sort_order int
- planned_start_time time nullable
- planned_duration_minutes int nullable
- estimated_cost int nullable
- note text nullable

itinerary_feedback
- id uuid pk
- itinerary_id uuid
- user_id uuid
- action enum(view, save, share, dismiss, complete)
- rating int nullable
- feedback text nullable
- created_at timestamptz
```

### 13A.5. Recommendation input

User input khi yeu cau goi y lo trinh:

```txt
province_id hoac destination
start_location optional
trip_days: 1-3 ngay ban dau
budget_level: low, medium, high
budget_amount optional
interests: food, cafe, nature, culture, photo, family, nightlife
pace: relaxed, balanced, packed
transport_mode: walking, motorbike, car, taxi
time_start optional
must_visit_place_ids optional
avoid_place_ids optional
```

### 13A.6. Recommendation output

API tra ve:

```txt
itinerary_id
title
summary
days[]
  items[]
    place
    reason
    estimated_arrival_time
    estimated_duration_minutes
    estimated_cost
    travel_to_next
      distance
      duration
      cost
total_estimated_cost
total_estimated_duration
confidence_score
warnings[]
```

Warnings vi du:

- Thieu du lieu gia cho mot so dia diem.
- Thoi gian di chuyen chi la uoc tinh.
- Dia diem co the dong cua vao ngay da chon.

### 13A.7. Cach lam giai doan dau khi chua co AI phuc tap

Ban dau nen lam rule-based recommendation, chua can ML/AI:

```txt
1. Loc places theo province/category/budget/opening hours.
2. Cham diem place dua tren rating, post_count, save_count, recency.
3. Loai dia diem qua xa nhau neu trip ngan.
4. Gom nhom theo khu vuc gan nhau.
5. Sap xep route bang heuristic nearest-neighbor.
6. Can bang category: an uong + trai nghiem + check-in.
7. Tinh cost tu place_cost_profiles va transport_edges.
8. Tra ve 2-3 phuong an itinerary.
```

Score co ban:

```txt
place_score =
  rating_avg * 2
  + log(post_count + 1)
  + log(save_count + 1)
  + interest_match_score
  + budget_match_score
  - distance_penalty
```

### 13A.8. Khi nao moi them AI/ML

Chi nen them AI/ML khi:

- Co du du lieu user behavior.
- Co du places/reviews/posts moi tinh/thanh.
- Rule-based bat dau khong dap ung duoc ca nhan hoa.
- Co metric de do chat luong goi y.

AI co the dung cho:

- Tao description lich trinh tu danh sach dia diem.
- Giai thich vi sao recommend.
- Tom tat review va bai viet cua user.
- Parse nhu cau tu natural language.
- Rerank itinerary candidates.

Khong nen de AI quyet dinh route/cost mot minh. Route va cost nen dua tren structured data, AI chi nen ho tro dien giai va reranking.

### 13A.9. API tuong lai

```txt
POST /itineraries/recommend
GET  /itineraries/:id
POST /itineraries/:id/save
POST /itineraries/:id/feedback
PATCH /itineraries/:id
DELETE /itineraries/:id

GET  /places/:id/cost-profile
PATCH /admin/places/:id/cost-profile
GET  /transport/estimate?fromPlaceId=&toPlaceId=&mode=
```

### 13A.10. Cac task chuan bi tu MVP, khong thi cong recommendation ngay

Nhung task nen lam som vi chi phi thap va giup du lieu dung:

- Bat buoc post co the gan `primary_place_id`.
- Places co category, province, district, lat/lng.
- Reviews co rating va optional `cost_per_person`.
- Places co optional `price_level`.
- Counters cua post/place duoc cap nhat dung.
- Saved posts duoc implement vi la signal rat tot.
- Search/filter places theo category/province.
- Cursor pagination va index dung cho place/post/feed.

Nhung task de sau:

- Itinerary generation.
- Cost optimizer.
- Route optimizer.
- Transport estimate.
- AI itinerary summary.
- Personalized recommendation.
- Analytics event pipeline.

### 13A.11. Rui ro va cach giam rui ro

Rui ro:

- Du lieu dia diem thieu toa do hoac sai toa do.
- Gia ca thay doi theo thoi gian.
- User review it nen recommendation thieu tin cay.
- Route/cost uoc tinh sai lam user mat niem tin.
- Qua som lam AI se ton chi phi va khong co du du lieu.

Cach giam:

- Bat dau voi rule-based va hien thi ro "uoc tinh".
- Cho user feedback itinerary.
- Cho admin cap nhat cost profile cho dia diem quan trong.
- Uu tien tinh/thanh nho truoc thay vi toan quoc.
- Chi recommend trong khu vuc co du data.
- Khong show confidence cao neu data thieu.

## 14. Task breakdown chi tiet

## Epic 0 - Project foundation

### Task 0.1 - Khoi tao NestJS project

Muc tieu:

- Tao project backend NestJS co cau truc san sang cho modular monolith.

Viec can lam:

- Tao app NestJS moi.
- Cau hinh TypeScript strict neu phu hop.
- Cau hinh ESLint va Prettier.
- Tao folder `src/common`, `src/config`, `src/database`.
- Them global API prefix `/api/v1`.
- Them endpoint `GET /health`.
- Them `ConfigModule` doc env.

Acceptance criteria:

- Chay duoc `npm run start:dev`.
- `GET /api/v1/health` tra ve status OK.
- Project build thanh cong.

### Task 0.2 - Cau hinh Docker Compose local

Muc tieu:

- Dev co the chay local bang mot lenh.

Viec can lam:

- Tao `docker-compose.yml`.
- Them service PostgreSQL.
- Them service API neu can.
- Cau hinh `.env.example`.
- Document lenh chay local.

Acceptance criteria:

- `docker compose up` khoi dong PostgreSQL.
- Backend ket noi duoc DB local.
- `.env.example` co day du bien can thiet.

### Task 0.3 - Prisma setup

Muc tieu:

- Ket noi PostgreSQL qua Prisma.

Viec can lam:

- Cai Prisma.
- Tao `prisma/schema.prisma`.
- Cau hinh datasource PostgreSQL.
- Tao `PrismaService`.
- Them database module.
- Tao migration dau tien.

Acceptance criteria:

- Chay duoc migration.
- Backend inject duoc PrismaService.
- Co script `prisma:migrate`, `prisma:generate`.

### Task 0.4 - Global validation va error format

Muc tieu:

- Tat ca API co validation va error response thong nhat.

Viec can lam:

- Cau hinh global validation pipe.
- Tao global exception filter.
- Tao error code convention.
- Tao response shape chung.

Acceptance criteria:

- Input sai tra ve HTTP 400 voi format error thong nhat.
- Exception khong bi leak stack trace o production.

### Task 0.5 - Swagger/OpenAPI

Muc tieu:

- Frontend/mobile co API docs tu dong.

Viec can lam:

- Cai Swagger module.
- Cau hinh `/docs`.
- Them bearer auth schema.
- Them tag cho tung module.

Acceptance criteria:

- Truy cap duoc `/docs`.
- API docs hien thi auth bearer.

## Epic 1 - Authentication

### Task 1.1 - User database schema

Muc tieu:

- Tao bang user va profile can thiet cho auth.

Viec can lam:

- Tao model `User`.
- Tao model `UserProfile`.
- Tao enum role/status.
- Tao migration.
- Them unique index cho email va username.

Acceptance criteria:

- Migration tao bang thanh cong.
- Username va email unique.

### Task 1.2 - Register API

Muc tieu:

- User tao tai khoan bang email/password.

Viec can lam:

- Tao `AuthModule`.
- Tao DTO register.
- Validate email, username, password.
- Hash password.
- Tao user va profile trong transaction.
- Tra ve user public fields.

Acceptance criteria:

- Register thanh cong voi email chua ton tai.
- Register fail neu email/username da ton tai.
- Password khong luu plain text.

### Task 1.3 - Login API

Muc tieu:

- User dang nhap va nhan access token + refresh token.

Viec can lam:

- Tao DTO login.
- Tim user theo email hoac username.
- Verify password.
- Tao JWT access token.
- Tao refresh token random.
- Hash refresh token va luu DB.

Acceptance criteria:

- Login dung thong tin tra token.
- Login sai tra 401.
- Refresh token duoc hash trong DB.

### Task 1.4 - Refresh token API

Muc tieu:

- Cap access token moi bang refresh token.

Viec can lam:

- Tao model `RefreshToken`.
- Tao endpoint `/auth/refresh`.
- Verify refresh token hash.
- Check expires/revoked.
- Rotation refresh token.

Acceptance criteria:

- Refresh token hop le tra access token moi.
- Token cu bi revoke sau khi rotate.
- Token het han tra 401.

### Task 1.5 - Auth guard va current user

Muc tieu:

- Bao ve API can dang nhap.

Viec can lam:

- Tao JWT strategy/guard.
- Tao decorator `@CurrentUser()`.
- Tao public route decorator neu can.

Acceptance criteria:

- API protected khong co token tra 401.
- API protected co token hop le lay duoc user id.

## Epic 2 - User profile

### Task 2.1 - Get current profile

Muc tieu:

- User xem profile cua chinh minh.

Viec can lam:

- Tao `UsersModule`.
- Tao endpoint `GET /users/me`.
- Join user profile.
- Hide sensitive fields.

Acceptance criteria:

- Tra ve id, username, displayName, avatar, bio, counters.
- Khong tra password hash.

### Task 2.2 - Update profile

Muc tieu:

- User cap nhat display name, bio, home location.

Viec can lam:

- Tao DTO update profile.
- Validate length.
- Check ownership.
- Update profile.

Acceptance criteria:

- User update duoc profile cua minh.
- Bio qua dai bi reject.

### Task 2.3 - Public user profile

Muc tieu:

- Xem profile cong khai cua user khac.

Viec can lam:

- Endpoint `GET /users/:id`.
- Endpoint `GET /users/username/:username`.
- Include counts.
- Include relationship viewer da follow hay chua neu co auth.

Acceptance criteria:

- User public profile tra thong tin can thiet.
- User khong ton tai tra 404.

## Epic 3 - Media

### Task 3.1 - Media schema

Muc tieu:

- Luu metadata media.

Viec can lam:

- Tao model `MediaAsset`.
- Tao enum media type/status.
- Tao migration.
- Index owner_id va object_key.

Acceptance criteria:

- DB co bang media assets.
- Object key unique.

### Task 3.2 - Cloudflare R2 client

Muc tieu:

- Backend noi chuyen duoc voi R2 bang S3-compatible API.

Viec can lam:

- Cau hinh env R2 account id, access key, secret, bucket, public base URL.
- Tao `StorageService`.
- Implement generate presigned put URL.
- Implement object key convention.

Acceptance criteria:

- Tao duoc presigned URL.
- Object key khong doan duoc va co owner prefix.

### Task 3.3 - Presigned upload API

Muc tieu:

- Client xin URL upload anh.

Viec can lam:

- Endpoint `POST /media/presigned-upload`.
- Validate mime type.
- Validate size.
- Tao media pending.
- Tra upload URL va media id.

Acceptance criteria:

- Chi chap nhan jpeg/png/webp.
- File qua lon bi reject.
- Media status ban dau la pending.

### Task 3.4 - Confirm upload API

Muc tieu:

- Xac nhan media da upload xong.

Viec can lam:

- Endpoint `POST /media/confirm-upload`.
- Check media owner.
- Update status uploaded.
- Luu public URL.

Acceptance criteria:

- User chi confirm media cua minh.
- Media uploaded co public URL.

## Epic 4 - Posts

### Task 4.1 - Post schema

Muc tieu:

- Tao data model cho bai viet.

Viec can lam:

- Tao model `Post`.
- Tao model `PostMedia`.
- Tao enum visibility/status.
- Tao indexes cho author/status/created_at.

Acceptance criteria:

- Migration thanh cong.
- Post lien ket duoc media.

### Task 4.2 - Create post

Muc tieu:

- User tao bai viet voi text va media.

Viec can lam:

- Endpoint `POST /posts`.
- Validate content length.
- Validate media ids thuoc ve user va da uploaded.
- Gioi han toi da 5 anh.
- Tao post va post_media trong transaction.
- Tang `post_count` cua user.

Acceptance criteria:

- Tao post thanh cong.
- Khong gan duoc media cua user khac.
- Qua 5 media bi reject.

### Task 4.3 - Get post detail

Muc tieu:

- Lay chi tiet bai viet.

Viec can lam:

- Endpoint `GET /posts/:id`.
- Include author public profile.
- Include media.
- Include counts.
- Include viewer state: liked/saved neu co auth.

Acceptance criteria:

- Post public xem duoc.
- Post hidden/deleted khong xem duoc voi user thuong.

### Task 4.4 - Update post

Muc tieu:

- User sua noi dung bai viet cua minh.

Viec can lam:

- Endpoint `PATCH /posts/:id`.
- Check ownership.
- Validate visibility/content.
- Update updated_at.

Acceptance criteria:

- Owner sua duoc.
- User khac tra 403.

### Task 4.5 - Delete post

Muc tieu:

- User xoa mem bai viet.

Viec can lam:

- Endpoint `DELETE /posts/:id`.
- Check ownership.
- Set status deleted va deleted_at.
- Giam post_count neu can.

Acceptance criteria:

- Post deleted khong hien tren feed.
- API get detail tra 404 cho user thuong.

## Epic 5 - Comments

### Task 5.1 - Comment schema

Muc tieu:

- Tao bang comment.

Viec can lam:

- Model `Comment`.
- Parent comment nullable cho reply cap 1.
- Index post_id, created_at.

Acceptance criteria:

- Migration thanh cong.

### Task 5.2 - Create comment

Muc tieu:

- User comment vao post.

Viec can lam:

- Endpoint `POST /posts/:postId/comments`.
- Check post published.
- Validate content.
- Neu co parent_id thi parent phai cung post.
- Transaction tao comment va tang comment_count.
- Tao notification cho author post neu khac user.

Acceptance criteria:

- Comment thanh cong tang count.
- Comment vao post deleted bi reject.

### Task 5.3 - List comments

Muc tieu:

- Lay comment theo post.

Viec can lam:

- Endpoint `GET /posts/:postId/comments`.
- Cursor pagination.
- Include author profile.
- Sap xep created_at asc hoac desc theo convention.

Acceptance criteria:

- Tra comments dung post.
- Co nextCursor.

### Task 5.4 - Update/delete comment

Muc tieu:

- User quan ly comment cua minh.

Viec can lam:

- Endpoint update.
- Endpoint delete soft.
- Check ownership hoac admin role.
- Giam comment_count khi delete.

Acceptance criteria:

- Owner sua/xoa duoc.
- User khac tra 403.

## Epic 6 - Reactions and saved posts

### Task 6.1 - Reaction schema

Muc tieu:

- Luu like cua post.

Viec can lam:

- Model `PostReaction`.
- Unique user_id + post_id.
- Index post_id.

Acceptance criteria:

- Mot user chi like mot lan.

### Task 6.2 - Like/unlike post

Muc tieu:

- User like/unlike post.

Viec can lam:

- Endpoint `POST /posts/:id/reactions`.
- Endpoint `DELETE /posts/:id/reactions`.
- Dung transaction de update count.
- Tao notification khi like.

Acceptance criteria:

- Like nhieu lan khong tang count sai.
- Unlike nhieu lan khong lam count am.

### Task 6.3 - Saved post schema/API

Muc tieu:

- User luu bai viet.

Viec can lam:

- Model `SavedPost`.
- Endpoint save/unsave.
- Endpoint list saved posts.
- Update save_count.

Acceptance criteria:

- Save idempotent.
- List saved posts co pagination.

## Epic 7 - Follows

### Task 7.1 - Follow schema

Muc tieu:

- Luu quan he follow.

Viec can lam:

- Model `Follow`.
- Unique follower_id + following_id.
- Index follower_id va following_id.

Acceptance criteria:

- Mot user khong follow lap lai cung mot nguoi.

### Task 7.2 - Follow/unfollow API

Muc tieu:

- User follow/unfollow user khac.

Viec can lam:

- Endpoint follow.
- Endpoint unfollow.
- Khong cho follow chinh minh.
- Transaction update follower_count/following_count.
- Tao notification follow.

Acceptance criteria:

- Follow tang counter dung.
- Unfollow giam counter dung.
- Khong co counter am.

### Task 7.3 - Follower/following list

Muc tieu:

- Xem danh sach follower/following.

Viec can lam:

- Endpoint list followers.
- Endpoint list following.
- Cursor pagination.
- Include profile basic.

Acceptance criteria:

- Pagination hoat dong.
- Tra relationship state neu viewer logged in.

## Epic 8 - Feed

### Task 8.1 - Home feed MVP

Muc tieu:

- User xem feed tu nguoi dang follow va bai viet moi.

Viec can lam:

- Endpoint `GET /feed/home`.
- Query posts public tu following.
- Neu user follow it, chen them bai public moi nhat.
- Cursor pagination theo created_at + id.
- Include author/media/count/viewer state.

Acceptance criteria:

- Feed co du lieu khi user follow nguoi khac.
- User moi van thay bai public moi.

### Task 8.2 - Explore feed MVP

Muc tieu:

- Xem bai viet noi bat.

Viec can lam:

- Endpoint `GET /feed/explore`.
- Query public posts published.
- Sort theo score don gian hoac created_at.
- Co filter province/place/category sau nay.

Acceptance criteria:

- Feed public khong can login.
- Bai deleted/hidden khong hien.

### Task 8.3 - Feed performance review

Muc tieu:

- Dam bao query feed khong qua cham voi data seed.

Viec can lam:

- Seed 1k-10k posts local.
- Chay explain analyze query chinh.
- Them index neu can.
- Ghi lai query plan can chu y.

Acceptance criteria:

- Query feed MVP duoi nguong chap nhan local.
- Co index cho sort/filter chinh.

## Epic 9 - Places and travel domain

### Task 9.1 - Place category schema

Muc tieu:

- Quan ly loai dia diem.

Viec can lam:

- Model `PlaceCategory`.
- Seed categories: food, cafe, homestay, attraction, activity, local_market, viewpoint.

Acceptance criteria:

- Co API list categories.
- Seed chay duoc nhieu lan khong loi.

### Task 9.2 - Place schema

Muc tieu:

- Luu dia diem du lich.

Viec can lam:

- Model `Place`.
- Fields name, slug, description, address, category, lat/lng, status.
- Index slug/category/province.

Acceptance criteria:

- Migration thanh cong.
- Slug unique.

### Task 9.3 - Create/update place API

Muc tieu:

- Admin hoac user duoc phep tao dia diem.

Viec can lam:

- Endpoint create place.
- Endpoint update place.
- Validate lat/lng.
- Generate slug.
- Check role neu chi admin duoc tao.

Acceptance criteria:

- Place tao thanh cong.
- Slug duplicate duoc xu ly.

### Task 9.4 - List/search places

Muc tieu:

- User tim va browse dia diem.

Viec can lam:

- Endpoint `GET /places`.
- Filter category/province/q.
- Sort newest/rating.
- Pagination.

Acceptance criteria:

- Search theo name hoat dong.
- Filter category hoat dong.

### Task 9.5 - Attach place to post

Muc tieu:

- Bai viet co the gan dia diem.

Viec can lam:

- Them `primary_place_id` vao create/update post.
- Validate place published.
- Tang/giam post_count cua place.
- Endpoint list posts by place.

Acceptance criteria:

- Post hien place info.
- Place detail hien posts lien quan.

## Epic 10 - Reviews

### Task 10.1 - Review schema

Muc tieu:

- User review/rating dia diem.

Viec can lam:

- Model `PlaceReview`.
- Unique user_id + place_id neu moi user chi review mot lan.
- Rating 1-5.
- Optional content.

Acceptance criteria:

- Migration thanh cong.
- Rating ngoai 1-5 bi reject.

### Task 10.2 - Create/update review

Muc tieu:

- User tao hoac cap nhat review.

Viec can lam:

- Endpoint create review.
- Endpoint update review.
- Recompute rating_avg/rating_count.
- Transaction.

Acceptance criteria:

- Rating average dung sau create/update.
- User khong tao duplicate neu rule la one review per place.

### Task 10.3 - List place reviews

Muc tieu:

- Xem review cua dia diem.

Viec can lam:

- Endpoint `GET /places/:id/reviews`.
- Pagination.
- Include author profile.

Acceptance criteria:

- Tra dung review cua place.
- Sort newest default.

## Epic 11 - Search

### Task 11.1 - Basic unified search

Muc tieu:

- Search chung user/place/post.

Viec can lam:

- Endpoint `GET /search?q=`.
- Query places by name.
- Query users by username/display name.
- Query posts by content.
- Limit moi loai ket qua.

Acceptance criteria:

- Query rong bi reject hoac tra empty.
- Response gom groups: users, places, posts.

### Task 11.2 - PostgreSQL full-text/trigram optimization

Muc tieu:

- Search nhanh hon va dung tieng Viet tot hon trong muc co the.

Viec can lam:

- Them extension `pg_trgm`.
- Them trigram index cho name/username.
- Can nhac unaccent extension neu dung duoc.
- Chuan hoa search query.

Acceptance criteria:

- Search gan dung voi keyword partial.
- Query co index support.

## Epic 12 - Notifications

### Task 12.1 - Notification schema

Muc tieu:

- Persist notification.

Viec can lam:

- Model `Notification`.
- Index recipient_id + created_at.
- Enum notification type.

Acceptance criteria:

- Migration thanh cong.

### Task 12.2 - Create notification service

Muc tieu:

- Module khac tao notification qua service chung.

Viec can lam:

- Tao `NotificationsService.create`.
- Dedupe neu can cho like/follow.
- Khong notify neu actor == recipient.

Acceptance criteria:

- Like/comment/follow tao notification.
- Khong tao notification cho hanh dong cua chinh minh.

### Task 12.3 - Notification APIs

Muc tieu:

- User xem va mark read notification.

Viec can lam:

- Endpoint list notifications.
- Endpoint mark one read.
- Endpoint mark all read.
- Count unread.

Acceptance criteria:

- Chi xem notification cua minh.
- Mark read update read_at.

## Epic 13 - Admin and moderation

### Task 13.1 - Role guard

Muc tieu:

- Bao ve API admin.

Viec can lam:

- Tao `RolesGuard`.
- Tao decorator `@Roles`.
- Gan role admin/super_admin.

Acceptance criteria:

- User thuong khong vao duoc admin API.
- Admin vao duoc.

### Task 13.2 - Report schema/API

Muc tieu:

- User report noi dung xau.

Viec can lam:

- Model `Report`.
- Report entity type: post/comment/user/place.
- Endpoint create report.
- Endpoint admin list reports.

Acceptance criteria:

- User report duoc post/comment.
- Admin xem duoc report.

### Task 13.3 - Moderation actions

Muc tieu:

- Admin an/xoa noi dung vi pham.

Viec can lam:

- Model `ModerationAction`.
- Endpoint hide post.
- Endpoint hide comment.
- Endpoint suspend user.
- Ghi audit log.

Acceptance criteria:

- Hidden post khong hien feed.
- Action duoc log voi admin id.

## Epic 14 - Testing

### Task 14.1 - Unit test critical services

Muc tieu:

- Cover logic quan trong.

Viec can lam:

- Test auth password verify.
- Test token refresh rotation.
- Test create post media ownership.
- Test like idempotency.
- Test follow self rejection.

Acceptance criteria:

- Test pass trong CI/local.
- Cac case loi chinh duoc cover.

### Task 14.2 - E2E tests

Muc tieu:

- Dam bao flow chinh hoat dong.

Viec can lam:

- Register -> login -> create post.
- Upload mock media -> create post.
- Follow -> feed.
- Like/comment -> notification.

Acceptance criteria:

- E2E test chay voi test database.
- Cleanup data sau test.

## Epic 15 - Deployment

### Task 15.1 - Production Dockerfile

Muc tieu:

- Build backend thanh Docker image.

Viec can lam:

- Multi-stage Dockerfile.
- Install dependencies.
- Generate Prisma client.
- Build NestJS.
- Run production command.

Acceptance criteria:

- Docker image build thanh cong.
- Container start duoc voi env production.

### Task 15.2 - VPS deploy guide

Muc tieu:

- Co huong dan deploy chi phi thap.

Viec can lam:

- Document tao VPS.
- Cai Docker.
- Cau hinh env.
- Chay migration.
- Start Docker Compose.
- Cau hinh Nginx reverse proxy.
- Cau hinh HTTPS voi Let's Encrypt.

Acceptance criteria:

- Lam theo guide co the deploy duoc backend.

### Task 15.3 - Backup database

Muc tieu:

- Giam rui ro mat data.

Viec can lam:

- Script `pg_dump`.
- Luu backup local hoac R2.
- Cron job daily.
- Document restore.

Acceptance criteria:

- Tao duoc backup.
- Restore duoc vao database moi.

## 15. Definition of Done chung

Moi task code nen dat cac dieu kien:

- Co DTO validation.
- Co auth/role guard neu can.
- Co error code ro rang.
- Co migration neu thay doi DB.
- Co Swagger docs.
- Co unit/e2e test cho logic quan trong.
- Khong leak secret trong log/response.
- Query danh sach co pagination.
- Ownership check day du.
- Chay format/lint/test truoc khi merge.

## 16. Thu tu uu tien nen lam

Thu tu thuc hien de ra MVP nhanh:

```txt
1. Epic 0 - Project foundation
2. Epic 1 - Authentication
3. Epic 2 - User profile
4. Epic 3 - Media
5. Epic 4 - Posts
6. Epic 5 - Comments
7. Epic 6 - Reactions and saved posts
8. Epic 7 - Follows
9. Epic 8 - Feed
10. Epic 9 - Places
11. Epic 11 - Search
12. Epic 12 - Notifications
13. Epic 10 - Reviews
14. Epic 13 - Admin and moderation
15. Epic 14 - Testing hardening
16. Epic 15 - Deployment
```

## 17. Cac quyet dinh can chot truoc khi code

### 17.1. Auth

- Ban dau chi email/password hay co Google login?
- Username co bat buoc unique khong? Khuyen nghi: co.
- Co can verify email ngay MVP khong? Khuyen nghi: chua bat buoc.

### 17.2. Media

- MVP co cho video khong? Khuyen nghi: chua.
- Moi post toi da bao nhieu anh? Khuyen nghi: 5.
- File max size? Khuyen nghi: 5MB/anh ban dau.

### 17.3. Places

- Ai duoc tao dia diem? Admin only hay user submit?
- Place co can approval flow khong?
- Co can PostGIS ngay khong? Neu can nearby thi co.

### 17.4. Feed

- Home feed uu tien following hay explore?
- User moi chua follow ai se thay gi?
- Co can location permission tu mobile khong?

### 17.5. Deployment

- Chon free platform de demo hay VPS 5-10 USD/thang?
- Co domain chua?
- Co can CI/CD tu GitHub Actions khong?

## 18. Khuyen nghi chot cho giai doan dau

Nen bat dau voi:

```txt
NestJS modular monolith
PostgreSQL
Prisma
Cloudflare R2
REST API
Swagger
Docker Compose local
VPS nho khi public MVP
```

Chua nen dung:

```txt
Microservices
Kafka
Kubernetes
OpenSearch
Redis neu chua co bottleneck
Video upload
AI recommendation
Complex chat realtime
```

Muc tieu dung cua MVP backend la chung minh:

- User co muon dang bai du lich khong.
- User co muon tim/xem dia diem local khong.
- Feed co tao duoc vong lap quay lai app khong.
- Noi dung dia phuong co du hap dan de tiep tuc dau tu khong.

Neu cac gia thiet tren dung, ta moi tang chi phi infrastructure va tach service.
