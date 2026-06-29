# Phase 3 - Social Graph and Feed Tasks

Muc tieu phase nay la them like, save, follow, comments va feed MVP.

Level 0 cost guardrails:

- Feed MVP phai query truc tiep tu PostgreSQL voi index tot, khong dung Redis/cache server rieng.
- Notification trong phase nay chi tao data neu da co service sau, khong realtime, khong WebSocket.
- Khong them queue/worker de cap nhat counters; dung transaction PostgreSQL.
- Khong them recommendation/ML feed.
- Moi query danh sach phai co cursor pagination va limit de bao ve free database.

Khong lam trong phase nay:

- Khong personalized ML feed.
- Khong Redis cache.
- Khong realtime notification.
- Khong background worker/queue.

## P3-T01 - Comment schema

Objective:

- Tao bang comment cho post.

Dependencies:

- P2-T05.

Model:

```txt
Comment
- id uuid
- postId
- authorId
- parentId nullable
- content
- status enum PUBLISHED/HIDDEN/DELETED
- likeCount default 0
- createdAt
- updatedAt
- deletedAt nullable
```

Implementation steps:

1. Add enum `CommentStatus`.
2. Add model `Comment`.
3. Relation toi post, author, parent comment.
4. Index:
   - postId + createdAt
   - authorId + createdAt
   - parentId
5. Migration.

Acceptance criteria:

- Migration apply thanh cong.
- Parent comment nullable.

## P3-T02 - Create comment API

Objective:

- User comment vao post.

Dependencies:

- P3-T01.
- P1-T06.

API:

```txt
POST /api/v1/posts/:postId/comments
```

Request:

```json
{
  "content": "Dia diem nay dep qua",
  "parentId": null
}
```

Implementation steps:

1. Validate content 1-1000 chars.
2. Check post exists, status PUBLISHED.
3. Neu parentId co:
   - parent exists.
   - parent.postId = postId.
   - parent.parentId null neu chi cho reply cap 1.
4. Transaction:
   - create comment.
   - increment post.commentCount.
5. Return comment with author profile.

Acceptance criteria:

- Comment thanh cong tang count.
- Comment vao deleted post fail.
- Parent khac post fail.

## P3-T03 - List comments API

Objective:

- Lay comments cua post co pagination.

Dependencies:

- P3-T02.

API:

```txt
GET /api/v1/posts/:postId/comments?limit=20&cursor=
```

Implementation steps:

1. Check post exists va visible.
2. Query top-level comments `parentId null`.
3. Cursor pagination.
4. Include author profile.
5. Optional include first few replies count, khong can nested sau.

Acceptance criteria:

- Tra dung comments cua post.
- Deleted/hidden comment khong hien.
- Limit max 50.
- Response co nextCursor.

## P3-T04 - Update/delete comment API

Objective:

- Owner sua/xoa comment.

Dependencies:

- P3-T02.

APIs:

```txt
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
```

Implementation steps:

1. Update:
   - check comment exists.
   - check authorId = current user.
   - status PUBLISHED.
   - validate content.
2. Delete:
   - check owner.
   - soft delete.
   - decrement post.commentCount, not below 0.
3. Admin permission se lam phase sau.

Acceptance criteria:

- Owner update/delete duoc.
- Non-owner tra 403.
- Deleted comment khong hien list.

## P3-T05 - Post reaction schema

Objective:

- Luu like cua post.

Dependencies:

- P2-T05.

Model:

```txt
PostReaction
- userId
- postId
- reactionType enum LIKE
- createdAt
- unique(userId, postId)
```

Implementation steps:

1. Add enum `ReactionType`.
2. Add model with compound unique.
3. Add indexes postId, userId.
4. Migration.

Acceptance criteria:

- Mot user chi like mot post mot lan.

## P3-T06 - Like/unlike post API

Objective:

- User like/unlike post idempotent.

Dependencies:

- P3-T05.

APIs:

```txt
POST   /api/v1/posts/:id/reactions
DELETE /api/v1/posts/:id/reactions
```

Implementation steps:

1. Check post exists va published.
2. Like:
   - if reaction exists, return current state without increment.
   - else create reaction va increment likeCount.
3. Unlike:
   - if reaction not exists, return current state.
   - else delete reaction va decrement likeCount not below 0.
4. Use transaction.

Acceptance criteria:

- Like nhieu lan khong tang count sai.
- Unlike nhieu lan khong count am.
- User khong auth tra 401.

## P3-T07 - Saved posts schema and API

Objective:

- User save/unsave/list saved posts. Day la signal quan trong cho itinerary sau nay.

Dependencies:

- P2-T05.

Model:

```txt
SavedPost
- userId
- postId
- createdAt
- unique(userId, postId)
```

APIs:

```txt
POST   /api/v1/posts/:id/save
DELETE /api/v1/posts/:id/save
GET    /api/v1/users/me/saved-posts?limit=20&cursor=
```

Implementation steps:

1. Add model va migration.
2. Save:
   - check post visible.
   - create if not exists.
   - increment saveCount only on first save.
3. Unsave:
   - delete if exists.
   - decrement saveCount only if deleted.
4. List saved posts:
   - cursor by savedAt.
   - include post author/media/counts.

Acceptance criteria:

- Save idempotent.
- Unsave idempotent.
- List chi tra saved posts cua current user.

## P3-T08 - Follow schema

Objective:

- Luu relationship follow giua users.

Dependencies:

- P1-T01.

Model:

```txt
Follow
- followerId
- followingId
- createdAt
- unique(followerId, followingId)
```

Implementation steps:

1. Add model `Follow`.
2. Add relation user followers/following.
3. Index followerId va followingId.
4. Migration.

Acceptance criteria:

- Compound unique ngan duplicate follow.

## P3-T09 - Follow/unfollow API

Objective:

- User follow/unfollow user khac.

Dependencies:

- P3-T08.

APIs:

```txt
POST   /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
```

Implementation steps:

1. Check target user exists va active.
2. Reject follow self.
3. Follow transaction:
   - create if not exists.
   - increment current user's followingCount.
   - increment target's followerCount.
4. Unfollow transaction:
   - delete if exists.
   - decrement counters not below 0.
5. Return relationship state.

Acceptance criteria:

- Follow duplicate khong tang counter sai.
- Unfollow duplicate khong count am.
- Follow self tra 400.

## P3-T10 - Followers/following list APIs

Objective:

- Xem danh sach followers/following cua user.

Dependencies:

- P3-T09.

APIs:

```txt
GET /api/v1/users/:id/followers?limit=20&cursor=
GET /api/v1/users/:id/following?limit=20&cursor=
```

Implementation steps:

1. Cursor pagination by follow.createdAt + user id.
2. Include public profile.
3. Limit max 50.
4. Filter active users.

Acceptance criteria:

- Pagination dung.
- Response khong tra sensitive user fields.

## P3-T11 - Home feed MVP

Objective:

- Tao home feed tu following va bai public moi de user moi co noi dung.

Dependencies:

- P2-T10.
- P3-T09.
- P3-T06.
- P3-T07.

API:

```txt
GET /api/v1/feed/home?limit=20&cursor=
```

Implementation steps:

1. Protected endpoint.
2. Lay following ids cua current user.
3. Query posts:
   - status PUBLISHED.
   - visibility PUBLIC.
   - author in following ids OR fallback public recent.
4. Neu following count it hoac ket qua it, bo sung public recent.
5. Sort by createdAt desc, id desc.
6. Include author, media, counts.
7. Include viewer state liked/saved.
8. Cursor pagination.

Acceptance criteria:

- User follow nguoi khac thay post cua following.
- User moi van thay public recent posts.
- Deleted/hidden/private khong hien.
- Limit max 50.

## P3-T12 - Explore feed MVP

Objective:

- Tao feed public noi bat/moi nhat.

Dependencies:

- P2-T10.

API:

```txt
GET /api/v1/feed/explore?limit=20&cursor=
```

Implementation steps:

1. Public endpoint, optional auth.
2. Query public published posts.
3. Sort default:
   - createdAt desc cho MVP.
4. Optional score later:
   - likeCount, commentCount, saveCount.
5. Include author/media/counts.
6. Include viewer state neu co token.

Acceptance criteria:

- Khong can login van xem duoc.
- Hidden/deleted/private khong hien.
- Pagination dung.

## P3-T13 - Feed query performance review

Objective:

- Dam bao query feed co index can thiet.

Dependencies:

- P3-T11.
- P3-T12.

Implementation steps:

1. Tao seed script nho neu chua co:
   - 100 users.
   - 1,000 posts.
   - follows/reactions sample.
2. Chay query feed local.
3. Dung Prisma query logging hoac `EXPLAIN ANALYZE` voi SQL tuong duong.
4. Them/sua index neu can.
5. Ghi note vao docs neu co query can chu y.

Acceptance criteria:

- Feed query dung indexes author/status/createdAt.
- Query local voi data seed khong cham bat thuong.
- Khong them Redis de giai quyet van de o phase nay.
