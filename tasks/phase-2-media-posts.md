# Phase 2 - Media and Posts Tasks

Muc tieu phase nay la cho user upload anh qua Cloudflare R2 va tao/sua/xoa bai viet.

Cost target:

- Giai doan dau phai chay duoc voi chi phi ha tang 0 USD/thang.
- Media storage mac dinh dung Cloudflare R2 Free tier.
- Upload phai di truc tiep tu client len R2 bang presigned URL de backend khong ton bandwidth/CPU xu ly file.
- Backend chi luu metadata trong PostgreSQL, khong proxy file upload/download.
- Moi gioi han trong phase nay phai bao ve free tier: image only, toi da 5 anh/post, toi da 5MB/anh.

Scalability target:

- Tat ca thao tac storage phai di qua `StorageService`, khong import AWS/R2 SDK truc tiep trong posts/users modules.
- Business logic chi phu thuoc `mediaId`, `objectKey`, `bucket`, `storageProvider`, khong phu thuoc Cloudflare-specific API.
- Public URL nen duoc build qua storage service/config. `objectKey` moi la source of truth.
- Sau nay co the doi R2 sang S3/MinIO hoac them CDN custom domain bang cach doi env/config va implementation storage service.
- Khong lam resize/transcode trong API request path. Neu sau nay can, tach worker rieng.

Khong lam trong phase nay:

- Khong upload video.
- Khong resize/transcode media.
- Khong luu media vao local disk.
- Khong dung background queue.

## P2-T01 - Media database schema

Objective:

- Tao schema luu metadata media asset.

Dependencies:

- P1-T01.

Prisma model:

```txt
MediaAsset
- id uuid
- ownerId fk User
- storageProvider enum R2/S3/MINIO default R2
- bucket
- objectKey unique
- publicUrl
- publicUrlExpiresAt nullable
- mimeType
- sizeBytes
- width nullable
- height nullable
- durationSeconds nullable
- mediaType enum IMAGE/VIDEO
- status enum PENDING/UPLOADED/FAILED/DELETED
- createdAt
- updatedAt
```

Implementation steps:

1. Add enums `MediaType`, `MediaStatus`.
2. Add enum `StorageProvider` voi gia tri ban dau `R2`, them `S3`, `MINIO` de chuan bi migrate sau.
3. Add model `MediaAsset`.
4. Add relation owner -> user.
5. Add indexes:
   - ownerId
   - objectKey unique
   - status
   - storageProvider + bucket
6. Tao migration.

Acceptance criteria:

- Migration apply thanh cong.
- Object key unique.
- Media relation toi owner hoat dong.
- Co `storageProvider` de sau nay doi R2/S3/MinIO khong can sua business modules.
- `objectKey` va `bucket` la source of truth; `publicUrl` chi la cached/derived value.

## P2-T02 - R2 storage service

Objective:

- Tao abstraction cho object storage S3-compatible.

Dependencies:

- P0-T02.
- P2-T01.

Expected files:

```txt
src/media/storage/storage.service.ts
src/media/storage/r2-storage.service.ts
```

Implementation steps:

1. Cai AWS SDK S3 client packages can thiet.
2. Tao interface/abstract service cho:
   - createPresignedPutUrl
   - createPresignedGetUrl optional future
   - buildPublicUrl
   - buildObjectKey
   - getProviderName
3. Implement R2 client voi env:
   - R2_ENDPOINT
   - R2_ACCESS_KEY_ID
   - R2_SECRET_ACCESS_KEY
   - R2_BUCKET
   - R2_PUBLIC_BASE_URL
4. Object key convention:
   - `users/{userId}/media/{yyyy}/{mm}/{uuid}.{ext}`
5. URL expiration:
   - 5-15 minutes.

Acceptance criteria:

- Generate duoc presigned PUT URL.
- Object key khong doan duoc.
- Business module khong import AWS SDK truc tiep.
- Posts/users modules chi lam viec voi `MediaService`, khong biet R2.
- Doi public domain/CDN chi can doi `R2_PUBLIC_BASE_URL`, khong can migrate post data.

Security notes:

- Khong expose secret.
- Khong cho client tu chon object key raw.
- Presigned URL het han ngan, khuyen nghi 15 phut tro xuong.
- Khong log presigned URL day du vi URL co credential tam thoi.

## P2-T03 - Presigned upload API

Objective:

- Client xin URL de upload image truc tiep len R2.

Dependencies:

- P2-T02.
- P1-T06.

API:

```txt
POST /api/v1/media/presigned-upload
```

Request:

```json
{
  "mimeType": "image/jpeg",
  "sizeBytes": 1234567
}
```

Response:

```json
{
  "data": {
    "mediaId": "uuid",
    "uploadUrl": "https://...",
    "objectKey": "users/...",
    "expiresInSeconds": 900
  }
}
```

Implementation steps:

1. Tao `MediaModule`.
2. Tao `CreatePresignedUploadDto`.
3. Validate:
   - mimeType in `image/jpeg`, `image/png`, `image/webp`.
   - sizeBytes > 0.
   - sizeBytes <= 5MB.
4. Enforce per-user temporary upload guard:
   - khong cho tao qua nhieu media `PENDING` trong thoi gian ngan.
   - neu chua co rate limiter, check DB count pending gan day va reject voi 429/400 theo convention.
5. Generate object key.
6. Create `MediaAsset` status `PENDING`.
7. Generate presigned URL.
8. Return mediaId va uploadUrl.

Acceptance criteria:

- Protected endpoint.
- Invalid mime type tra 400.
- File > 5MB tra 400.
- Media pending duoc tao.
- Endpoint khong nhan binary file.
- Backend response khong chua R2 secret.
- Agent phai document day la direct-to-R2 upload de giu chi phi bandwidth backend bang 0.

## P2-T04 - Confirm media upload API

Objective:

- Mark media da upload xong va san sang gan vao post.

Dependencies:

- P2-T03.

API:

```txt
POST /api/v1/media/confirm-upload
```

Request:

```json
{
  "mediaId": "uuid",
  "width": 1200,
  "height": 800
}
```

Implementation steps:

1. Tao `ConfirmUploadDto`.
2. Check media exists.
3. Check owner la current user.
4. Check status `PENDING`.
5. Update:
   - status `UPLOADED`
   - width/height neu co
   - publicUrl tu storage service
   - storageProvider/bucket/objectKey giu nguyen, khong cho client sua
6. Return media public data.

Acceptance criteria:

- User chi confirm media cua minh.
- Confirm media uploaded lan 2 idempotent hoac tra conflict ro.
- Media uploaded co publicUrl.
- Client khong the confirm media cua user khac.
- Client khong the override objectKey/publicUrl.

Notes:

- MVP co the chua verify object ton tai tren R2 de tranh complexity. Ghi TODO neu bo qua.
- Neu verify object ton tai yeu cau API call ton operation free tier, chi verify khi can security cao hon.

## P2-T05 - Post database schema

Objective:

- Tao schema cho posts va post media.

Dependencies:

- P2-T01.

Prisma models:

```txt
Post
PostMedia
SavedPost optional later
```

Fields:

```txt
Post:
- id uuid
- authorId
- content text
- visibility enum PUBLIC/FOLLOWERS/PRIVATE
- status enum PUBLISHED/HIDDEN/DELETED
- primaryPlaceId nullable future
- likeCount default 0
- commentCount default 0
- saveCount default 0
- shareCount default 0
- createdAt
- updatedAt
- deletedAt nullable

PostMedia:
- id uuid
- postId
- mediaId
- sortOrder
- createdAt
```

Implementation steps:

1. Add enums `PostVisibility`, `PostStatus`.
2. Add `Post` model.
3. Add `PostMedia` model.
4. Add indexes:
   - authorId + createdAt desc
   - status + createdAt desc
   - primaryPlaceId + createdAt desc, nullable allowed
5. Tao migration.

Acceptance criteria:

- Migration apply thanh cong.
- Post co relation author va media.
- Post khong luu public URL media truc tiep; post chi join qua `PostMedia` -> `MediaAsset`.

## P2-T06 - Create post API

Objective:

- User tao bai viet voi content va toi da 5 anh.

Dependencies:

- P2-T04.
- P2-T05.
- P1-T06.

API:

```txt
POST /api/v1/posts
```

Request:

```json
{
  "content": "Mot ngay o Da Lat...",
  "visibility": "PUBLIC",
  "mediaIds": ["uuid1", "uuid2"],
  "primaryPlaceId": null
}
```

Implementation steps:

1. Tao `PostsModule`.
2. Tao `CreatePostDto`.
3. Validate:
   - content min 1 max 5000.
   - visibility enum.
   - mediaIds max 5.
   - no duplicate mediaIds.
4. Check media:
   - exists.
   - ownerId = current user.
   - status = UPLOADED.
   - mediaType = IMAGE.
5. Tao post va post_media trong transaction.
6. Increment user profile postCount.
7. Return post detail.

Acceptance criteria:

- Tao post thanh cong voi 0-5 anh.
- Media cua user khac tra 403/400.
- Media pending khong duoc attach.
- Qua 5 media tra 400.
- Tao post khong copy/duplicate media metadata vao post table.
- API khong proxy/download/upload image qua backend.

Test cases:

- Create text-only post.
- Create post with uploaded images.
- Create post with pending image fail.
- Create post with another user's media fail.

## P2-T07 - Get post detail API

Objective:

- Lay chi tiet bai viet public/published.

Dependencies:

- P2-T06.

API:

```txt
GET /api/v1/posts/:id
```

Implementation steps:

1. Query post by id.
2. Include:
   - author public profile.
   - media sorted by sortOrder.
   - counters.
3. Filter:
   - status must be PUBLISHED for normal user.
   - deletedAt null.
4. If optional auth exists later, include viewer state liked/saved.

Acceptance criteria:

- Public post xem duoc.
- Deleted/hidden post tra 404 voi user thuong.
- Response khong tra sensitive author fields.

## P2-T08 - Update post API

Objective:

- Owner sua content/visibility cua bai viet.

Dependencies:

- P2-T06.

API:

```txt
PATCH /api/v1/posts/:id
```

Request:

```json
{
  "content": "Updated content",
  "visibility": "PUBLIC"
}
```

Implementation steps:

1. Tao `UpdatePostDto`.
2. Find post.
3. Check post status not deleted.
4. Check `authorId = currentUser.id`.
5. Update allowed fields only:
   - content
   - visibility
6. Return updated post detail.

Acceptance criteria:

- Owner update duoc.
- Non-owner tra 403.
- Deleted post khong update duoc.

## P2-T09 - Delete post API

Objective:

- Owner xoa mem bai viet.

Dependencies:

- P2-T06.

API:

```txt
DELETE /api/v1/posts/:id
```

Implementation steps:

1. Find post.
2. Check owner.
3. If already deleted, return success idempotent.
4. Transaction:
   - set status DELETED.
   - set deletedAt.
   - decrement profile postCount, khong nho hon 0.
5. Return success.

Acceptance criteria:

- Deleted post khong hien detail/feed.
- Counter khong bi am.
- Non-owner tra 403.

## P2-T10 - List user posts API

Objective:

- Lay bai viet public cua mot user.

Dependencies:

- P2-T07.

API:

```txt
GET /api/v1/users/:id/posts?limit=20&cursor=
```

Implementation steps:

1. Cursor pagination bang `createdAt + id`.
2. Filter:
   - authorId.
   - status PUBLISHED.
   - visibility PUBLIC for viewer normal.
3. Include author/media/counts.
4. Return `nextCursor`.

Acceptance criteria:

- Pagination dung.
- Deleted/hidden/private khong hien voi public viewer.
- Limit max 50.

## P2-T11 - Media cost guardrails and cleanup task

Objective:

- Bao ve free tier bang cach han che media pending/orphan va gioi han upload MVP.

Dependencies:

- P2-T04.

Implementation steps:

1. Them config env optional:
   - `MEDIA_MAX_IMAGE_SIZE_BYTES=5242880`
   - `MEDIA_MAX_IMAGES_PER_POST=5`
   - `MEDIA_PENDING_TTL_MINUTES=60`
   - `MEDIA_MAX_PENDING_PER_USER=20`
2. Dung config thay vi hard-code magic number trong service.
3. Tao service method `cleanupExpiredPendingMedia`.
4. Cleanup chi update DB status `FAILED` hoac `DELETED` cho media pending qua han.
5. Neu implement xoa object R2:
   - phai di qua StorageService.
   - phai optional vi R2 operation cung co quota.
6. Khong can queue/cron production trong MVP. Co the expose command/script manual hoac service method de sau nay gan cron.

Acceptance criteria:

- Gioi han size/image count doc tu config.
- User khong tao vo han media pending.
- Co cach cleanup pending media het han.
- Cleanup khong yeu cau Redis/queue.

Cost notes:

- Free MVP uu tien chong abuse hon la xu ly media nang.
- Khong resize image server-side o phase nay vi ton CPU/RAM.
- Neu can toi uu dung luong, yeu cau client compress truoc khi upload.

## P2-T12 - Storage provider portability review

Objective:

- Kiem tra phase media da san sang nang cap tu R2 free sang S3/MinIO/CDN custom domain.

Dependencies:

- P2-T02.
- P2-T04.
- P2-T07.

Review checklist:

```txt
No posts/users module imports AWS SDK.
No code hard-codes Cloudflare account id.
No code hard-codes R2 public domain.
MediaAsset stores provider, bucket, objectKey.
StorageService builds public URL from config.
Presigned upload URL generation is isolated.
Post responses derive media URL through media/storage layer.
.env.example contains all R2 variables but no real secrets.
```

Acceptance criteria:

- Doi `R2_PUBLIC_BASE_URL` khong can database migration.
- Doi R2 sang S3/MinIO chi can them provider implementation va config.
- Agent ghi ro neu co diem nao con Cloudflare-specific trong business logic.
