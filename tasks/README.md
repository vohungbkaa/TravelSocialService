# Task Index - Backend Travel Social Service

Thu muc nay chua cac task thi cong chi tiet cho backend. Moi task duoc viet theo format de AI agent hoac developer co the nhan viec doc lap.

## Nguyen tac giao task cho agent

- Moi agent chi nen nhan 1 task hoac 1 nhom task nho co cung module.
- Agent phai doc `docs/backend-architecture-plan.md` truoc khi code.
- Agent khong duoc thay doi architecture neu task khong yeu cau.
- Agent khong duoc them Redis, Kafka, OpenSearch, Kubernetes trong MVP.
- Agent phai giu muc tieu chi phi ban dau bang 0 USD.
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

