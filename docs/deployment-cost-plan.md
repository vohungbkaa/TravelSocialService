# Phương án triển khai và chi phí cho mạng xã hội cấp xã

Tài liệu này chốt phương án triển khai backend TravelSocial cho bài toán mạng xã hội phục vụ 1 xã, ưu tiên:

- Giai đoạn đầu rẻ nhất có thể.
- Hạn chế downtime cho backend API.
- Lưu media bên ngoài server để không mất file khi deploy/restart.
- Có lộ trình nâng cấp rõ ràng khi traffic tăng.

Ngày tham chiếu giá: 2026-07-16.
Tỷ giá tạm tính: 1 USD ~ 26.000 VND.

## Stack hiện tại của project

Project hiện tại phù hợp với kiến trúc sau:

- Backend: NestJS chạy bằng `npm run start:prod`.
- ORM/database: Prisma + PostgreSQL.
- Health check: `/api/v1/health`.
- Upload media: đã có provider Cloudflare R2 qua `STORAGE_PROVIDER=r2`.
- File local chỉ nên dùng khi development, không nên dùng cho production.

## Phương án chốt

Dùng:

- Render cho backend NestJS.
- Neon cho PostgreSQL.
- Cloudflare R2 cho ảnh/video upload.
- Cloudflare DNS/CDN cho domain và cache media.

Lý do:

- Render Starter không bị sleep như Render Free.
- Render có HTTPS, deploy từ Git, rollback, health check.
- Neon phù hợp PostgreSQL/Prisma và có free tier cho giai đoạn đầu.
- Cloudflare R2 rẻ cho media, miễn phí egress ra Internet.
- Project đã có sẵn cấu hình R2 nên không phải đổi kiến trúc lớn.

## Giai đoạn 1: Pilot rẻ nhất nhưng chạy ổn

Mục tiêu: triển khai thật cho 1 xã ở giai đoạn đầu, cần URL ổn định, backend không sleep.

Đây là giai đoạn nên bắt đầu.

| Thành phần | Dịch vụ | Gói | Chi phí |
|---|---|---:|---:|
| Backend NestJS | Render | Starter Web Service | $7/tháng |
| Database | Neon | Free | $0/tháng |
| Storage ảnh/video | Cloudflare R2 | Free nếu dưới 10GB | $0/tháng |
| DNS/CDN | Cloudflare | Free | $0/tháng |
| Tổng |  |  | $7/tháng |

Quy đổi VND:

```text
$7 x 26.000 = 182.000 VND/tháng
```

Phù hợp khi:

- 100-500 active users/ngày.
- Chủ yếu đọc tin, địa điểm, shop, bài viết.
- Tổng media dưới 10GB.
- Database chưa chạy liên tục cả ngày.

Cấu hình khuyên dùng trên Render:

```text
Build command:
npm install && npm run prisma:generate && npm run build

Start command:
npm run start:prod

Health check path:
/api/v1/health
```

Biến môi trường production cần có:

```text
NODE_ENV=production
DATABASE_URL=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=...
CORS_ORIGINS=https://your-frontend-domain
```

Lưu ý:

- Không dùng `STORAGE_PROVIDER=local` trên production.
- Không lưu ảnh/video vào filesystem của Render.
- Nên deploy từ branch riêng như `production` hoặc `staging`.

Nguồn:

- Render pricing: https://render.com/pricing
- Render deploys and zero downtime: https://render.com/docs/deploys
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

## Giai đoạn 2: Một xã dùng thật

Mục tiêu: người dân bắt đầu dùng thường xuyên, có đăng bài, ảnh, video ngắn.

| Thành phần | Dịch vụ/gói | Chi phí dự kiến |
|---|---|---:|
| Backend | Render Starter | $7/tháng |
| Database | Neon Launch usage-based hoặc vẫn Free nếu đủ | $5-15/tháng |
| Storage | Cloudflare R2 10-100GB | $0-2/tháng |
| Tổng |  | $12-24/tháng |

Quy đổi VND:

```text
$12 x 26.000 = 312.000 VND/tháng
$24 x 26.000 = 624.000 VND/tháng
```

Phù hợp khi:

- 500-3.000 users đã đăng ký.
- 200-1.000 active users/ngày.
- 10.000-80.000 API requests/ngày.
- 10-100GB media.

Dấu hiệu cần chuyển Neon Free sang paid:

- Query bắt đầu chậm.
- App được dùng đều cả ngày.
- Neon Free gần hết CU-hours/storage.
- Database cold start làm request đầu tiên chậm.

Neon pricing cần chú ý:

- Free plan có 100 CU-hours mỗi project mỗi tháng.
- Free storage 0.5GB mỗi project.
- Launch plan tính theo usage, ví dụ $0.106/CU-hour và $0.35/GB-month storage.

Nguồn:

- Neon pricing: https://neon.com/pricing
- Render pricing: https://render.com/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

## Giai đoạn 3: Ổn định sản xuất

Mục tiêu: app xã chạy chính thức, nhiều bài viết/media, admin dùng thường xuyên.

| Thành phần | Dịch vụ/gói | Chi phí |
|---|---|---:|
| Backend | Render Standard, 2GB RAM / 1 CPU | $25/tháng |
| Database | Neon Launch/always-on nhỏ | $20-25/tháng |
| Storage | Cloudflare R2 100-500GB | $2-8/tháng |
| Tổng |  | $47-58/tháng |

Quy đổi VND:

```text
$47 x 26.000 = 1.222.000 VND/tháng
$58 x 26.000 = 1.508.000 VND/tháng
```

Khi nào nâng Render Starter lên Standard:

- Backend bị out-of-memory.
- API chậm khi nhiều request đồng thời.
- Upload/processing media làm app lag.
- Metrics CPU/RAM trên Render thường xuyên cao.

Khi nào cần database mạnh hơn:

- Post list/news feed chậm.
- Search/filter theo tenant/category/area chậm.
- Prisma query tăng nhiều.
- Connection pool bị cạn.
- Database storage vượt free tier.

Nguồn:

- Render Standard pricing: https://render.com/pricing
- Neon billing/pricing: https://neon.com/pricing
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

## Giai đoạn 4: Mở rộng nhiều xã

Mục tiêu: mở rộng từ 1 xã sang nhiều xã/phường/tenant.

| Thành phần | Chi phí dự kiến |
|---|---:|
| Backend Render Standard/Pro | $25-85/tháng |
| Neon database lớn hơn | $25-100+/tháng |
| Cloudflare R2 media | $5-30/tháng tùy video |
| Monitoring/logs thêm nếu cần | $0-20/tháng |
| Tổng | $55-235+/tháng |

Cần làm thêm khi vào giai đoạn này:

- Tách môi trường staging và production.
- Backup database định kỳ.
- Direct upload lên R2 bằng signed URL.
- Nén ảnh/video trước khi upload.
- Rate limit API.
- CDN cache cho media.
- Monitoring lỗi và latency.
- Migration database theo hướng backward-compatible.

## Chi phí Cloudflare R2 cho media

Cloudflare R2 free mỗi tháng:

- 10GB storage.
- 1 triệu Class A operations.
- 10 triệu Class B operations.
- Egress ra Internet miễn phí.

Giá storage standard sau free tier:

```text
$0.015 / GB-month
```

Ví dụ:

```text
100GB media:
(100 - 10) x $0.015 = $1.35/tháng

500GB media:
(500 - 10) x $0.015 = $7.35/tháng
```

R2 rất rẻ cho storage. Rủi ro chi phí và trải nghiệm nằm chủ yếu ở video dung lượng lớn. Nên đặt giới hạn ngay từ đầu:

- Ảnh nên nén còn 300KB-1MB.
- Video giới hạn 20-50MB/file trong giai đoạn đầu.
- Upload video nên đi trực tiếp client -> R2, backend chỉ cấp signed URL hoặc lưu metadata.

Nguồn:

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/

## So sánh với Dokploy và Vercel

### Dokploy

Dokploy có thể dùng được nếu muốn tự quản VPS.

| Phương án | Chi phí |
|---|---:|
| VPS 1GB + Neon + R2 | $6-15/tháng |
| VPS 2GB + Neon + R2 | $12-25/tháng |

Ưu điểm:

- Rẻ và linh hoạt.
- Chạy NestJS dạng server truyền thống rất hợp.
- Có thể quản lý Docker, database, backup trong 1 dashboard.

Nhược điểm:

- Tự quản OS, Docker, disk, security, backup, monitoring.
- 1 VPS vẫn có downtime nếu VPS lỗi, reboot, đầy disk, hết RAM.
- Muốn gần như không downtime cần 2 VPS + load balancer, chi phí sẽ tăng.

Nguồn:

- Dokploy docs: https://docs.dokploy.com/docs/core
- Dokploy GitHub: https://github.com/Dokploy/dokploy
- DigitalOcean Droplet pricing: https://www.digitalocean.com/pricing/droplets

### Vercel

Không khuyên dùng Vercel cho backend NestJS hiện tại.

Lý do:

- Project đang là NestJS server chạy lâu dài bằng `node dist/main`.
- Vercel phù hợp hơn cho frontend/Next.js/serverless.
- Vercel Functions có giới hạn request/response body 4.5MB, không phù hợp upload video qua backend.
- Nếu dùng Vercel, nên để frontend trên Vercel và backend trên Render/Dokploy.
- Vercel Pro có giá $20/tháng, cao hơn Render Starter.

Nguồn:

- Vercel pricing: https://vercel.com/pricing
- Vercel function limits: https://vercel.com/docs/functions/limitations

## Chốt khuyến nghị

Bắt đầu bằng Giai đoạn 1:

```text
Render Starter + Neon Free + Cloudflare R2 Free
Tổng: $7/tháng ~ 182.000 VND/tháng
```

Đây là mức rẻ nhất vẫn hợp lý cho triển khai thật vì backend không sleep như Render Free.

Khi xã dùng thật và database bắt đầu có tải đều, chuyển sang Giai đoạn 2:

```text
Render Starter + Neon paid usage nhỏ + Cloudflare R2
Tổng: $12-24/tháng ~ 312.000-624.000 VND/tháng
```

Khi app trở thành hệ thống chính thức và cần hiệu năng ổn định hơn, chuyển sang Giai đoạn 3:

```text
Render Standard + Neon paid + Cloudflare R2
Tổng: $47-58/tháng ~ 1.22-1.51 triệu VND/tháng
```
