# Phase 2 - Media and Posts Tasks

Muc tieu phase nay la cho user upload anh qua Cloudflare R2 va tao/sua/xoa bai viet.

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
- bucket
- objectKey unique
- publicUrl
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
2. Add model `MediaAsset`.
3. Add relation owner -> user.
4. Add indexes:
   - ownerId
   - objectKey unique
   - status
5. Tao migration.

Acceptance criteria:

- Migration apply thanh cong.
- Object key unique.
- Media relation toi owner hoat dong.

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
   - buildPublicUrl
   - buildObjectKey
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

Security notes:

- Khong expose secret.
- Khong cho client tu chon object key raw.

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
4. Generate object key.
5. Create `MediaAsset` status `PENDING`.
6. Generate presigned URL.
7. Return mediaId va uploadUrl.

Acceptance criteria:

- Protected endpoint.
- Invalid mime type tra 400.
- File > 5MB tra 400.
- Media pending duoc tao.

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
6. Return media public data.

Acceptance criteria:

- User chi confirm media cua minh.
- Confirm media uploaded lan 2 idempotent hoac tra conflict ro.
- Media uploaded co publicUrl.

Notes:

- MVP co the chua verify object ton tai tren R2 de tranh complexity. Ghi TODO neu bo qua.

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

