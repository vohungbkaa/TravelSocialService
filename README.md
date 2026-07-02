# Travel Social Service

Backend NestJS + Prisma + PostgreSQL cho nền tảng du lịch nhiều tenant. Một backend và một web client có thể phục vụ nhiều địa phương như `tien-thang`, `da-nang`; tenant được xác định bằng domain hoặc bằng query override khi demo qua ngrok free.

Tài liệu này viết từ góc nhìn repo backend `TravelSocialService`. Các lệnh web client chạy trong repo `TravelSocialWebApp`.

## 1. Chạy Local Từ Đầu

### 1.1. Cài package và tạo env

Backend:

```bash
cd TravelSocialService
npm install
cp .env.example .env
```

Web client:

```bash
cd TravelSocialWebApp
npm install
cp .env.example .env
```

Backend `.env` local tối thiểu:

```txt
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/travel_social
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://tien-thang.localhost:5173,http://da-nang.localhost:5173,https://*.ngrok-free.app
DEFAULT_TENANT_CODE=tien-thang
ENABLE_TENANT_CODE_OVERRIDE=false
STORAGE_PROVIDER=local
STORAGE_LOCAL_BASE_URL=/media
```

Web client `.env` local:

```txt
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Nếu web và API được reverse proxy chung domain, có thể dùng:

```txt
VITE_API_BASE_URL=/api/v1
```

### 1.2. Chạy PostgreSQL

Dùng Docker:

```bash
docker compose up -d postgres
```

Hoặc PostgreSQL local trên macOS:

```bash
brew services start postgresql@16
```

### 1.3. Migrate Prisma

```bash
cd TravelSocialService
npm run prisma:migrate
npm run prisma:generate
```

### 1.4. Seed dữ liệu mặc định

Chạy full seed:

```bash
npm run db:seed:all
```

Lệnh này tương đương:

```bash
npm run db:seed:admin
npm run tenant:seed:all
```

Kết quả:

- Tạo `SUPER_ADMIN` global từ biến `SEED_ADMIN_*` trong `.env`.
- Tạo tenant `tien-thang` với domain `tien-thang.localhost`.
- Tạo tenant `da-nang` với domain `da-nang.localhost`.
- Tạo area mặc định và boundary GeoJSON cho từng tenant.
- Tạo marker icons và danh mục địa điểm mặc định.
- Tạo địa điểm mẫu cho tenant `tien-thang`.

Reset sạch database local rồi seed lại:

```bash
npm run db:reset:seed
```

Lệnh này đang gọi `npx prisma migrate reset --force` rồi chạy lại `npm run db:seed:all`. Nó xóa dữ liệu hiện tại và chèn lại dữ liệu mẫu, chỉ dùng cho local/dev.

Nếu bạn **chỉ muốn xoá sạch dữ liệu** (đưa database về trạng thái trống hoàn toàn, không nạp lại dữ liệu mẫu):

```bash
npx prisma migrate reset --force
```

### 1.5. Chạy backend và web client

Backend:

```bash
cd TravelSocialService
npm run start:dev
```

Backend URL:

```txt
http://localhost:3000/api/v1
http://localhost:3000/docs
```

Web client:

```bash
cd TravelSocialWebApp
npm run dev -- --host 0.0.0.0
```

Web URL local:

```txt
http://localhost:5173/?tenant=tien-thang
http://localhost:5173/?tenant=da-nang
http://tien-thang.localhost:5173
http://da-nang.localhost:5173
```

## 2. Tenant URL Và Header

### 2.1. Local theo hostname

Mỗi tenant có một domain local trong DB:

```txt
tien-thang.localhost -> tenant tien-thang
da-nang.localhost    -> tenant da-nang
```

Full URL:

```txt
http://tien-thang.localhost:5173
http://da-nang.localhost:5173
```

Client gửi:

```txt
X-Tenant-Host: tien-thang.localhost
```

hoặc:

```txt
X-Tenant-Host: da-nang.localhost
```

Backend resolve theo `Tenant.domain`.

### 2.2. Local hoặc demo qua query tenant

Dùng khi chỉ có một hostname, ví dụ `localhost` hoặc một ngrok free domain:

```txt
http://localhost:5173/?tenant=tien-thang
http://localhost:5173/?tenant=da-nang
```

Client đọc query `tenant`, lưu trong session, rồi gửi:

```txt
X-Tenant-Host: localhost
X-Tenant-Code: tien-thang
```

hoặc:

```txt
X-Tenant-Host: localhost
X-Tenant-Code: da-nang
```

Backend chỉ chấp nhận `X-Tenant-Code` khi `NODE_ENV` không phải `production`, hoặc khi bật:

```txt
ENABLE_TENANT_CODE_OVERRIDE=true
```

### 2.3. Ngrok free

Nếu chỉ có một ngrok public URL:

```txt
https://abc-123.ngrok-free.app
```

thì URL gửi cho từng bên là:

```txt
https://abc-123.ngrok-free.app?tenant=tien-thang
https://abc-123.ngrok-free.app?tenant=da-nang
```

Nếu backend và web client chạy khác origin qua ngrok, backend `.env` nên có:

```txt
CORS_ORIGINS=https://*.ngrok-free.app
ENABLE_TENANT_CODE_OVERRIDE=true
```

Nếu ngrok proxy cả web và API chung domain, web client dùng:

```txt
VITE_API_BASE_URL=/api/v1
```

Nếu web và API là hai ngrok URLs khác nhau, web client dùng API URL đầy đủ:

```txt
VITE_API_BASE_URL=https://api-abc-123.ngrok-free.app/api/v1
```

### 2.4. Production domain thật

Production nên dùng domain riêng cho từng tenant:

```txt
https://tienthang.example.vn
https://danang.example.vn
https://nhatrang.example.vn
```

DB tenant config tương ứng:

```txt
Tenant.code=tien-thang, Tenant.domain=tienthang.example.vn
Tenant.code=da-nang,    Tenant.domain=danang.example.vn
Tenant.code=nha-trang,  Tenant.domain=nhatrang.example.vn
```

Client gửi:

```txt
X-Tenant-Host: danang.example.vn
```

Production không nên dùng `?tenant=` làm cơ chế chính. Chỉ bật `ENABLE_TENANT_CODE_OVERRIDE=true` cho demo/admin nội bộ khi thật sự cần.

## 3. Build Local

Backend:

```bash
cd TravelSocialService
npm run build
npm run start:prod
```

Web client:

```bash
cd TravelSocialWebApp
npm run build
npm run preview -- --host 0.0.0.0
```

Preview web mặc định:

```txt
http://localhost:4173
```

## 4. Deploy

### 4.1. Database

Dùng Supabase Free Postgres hoặc PostgreSQL managed bất kỳ. Lấy connection string và set:

```txt
DATABASE_URL=postgresql://...
```

Chạy migration trên môi trường deploy:

```bash
npm run prisma:deploy
npm run prisma:generate
```

Seed lần đầu nếu DB trống:

```bash
npm run db:seed:admin
npm run tenant:seed:local
npm run db:seed:categories
```

Chỉ chạy `npm run db:seed:mock-places` nếu muốn nạp dữ liệu mẫu Tiến Thắng.

### 4.2. Backend deploy

Build command:

```bash
npm install
npm run prisma:generate
npm run build
```

Start command:

```bash
npm run prisma:deploy
npm run start:prod
```

Env production tối thiểu:

```txt
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
CORS_ORIGINS=https://tienthang.example.vn,https://danang.example.vn
DEFAULT_TENANT_CODE=tien-thang
ENABLE_TENANT_CODE_OVERRIDE=false
STORAGE_PROVIDER=local
STORAGE_LOCAL_BASE_URL=/media
```

Nếu dùng Cloudflare R2 cho media:

```txt
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_BASE_URL=https://cdn.example.vn
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
```

### 4.3. Web client deploy

Build command trong repo web:

```bash
npm install
npm run build
```

Nếu web gọi API domain riêng:

```txt
VITE_API_BASE_URL=https://api.example.vn/api/v1
```

Nếu web và API chung domain qua reverse proxy:

```txt
VITE_API_BASE_URL=/api/v1
```

Tất cả tenant domain trỏ về cùng bản web client. Tenant được phân biệt bằng `window.location.hostname`.

## 5. Lệnh Tạo Và Gán User

### 5.1. Tạo SUPER_ADMIN global

Sửa `.env`:

```txt
SEED_ADMIN_EMAIL=admin@travelsocial.xyz
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=SuperSecureAdminPassword123!
SEED_ADMIN_DISPLAY_NAME=Super Admin
```

Chạy:

```bash
npm run db:seed:admin
```

`SUPER_ADMIN` không cần thuộc tenant nào và có quyền hệ thống.

### 5.2. Tạo admin tenant mới

Tiến Thắng:

```bash
TENANT_CODE=tien-thang \
ADMIN_EMAIL=admin.tienthang@example.com \
ADMIN_USERNAME=admin_tienthang \
ADMIN_PASSWORD=change-me \
ADMIN_DISPLAY_NAME="Admin Tiến Thắng" \
TENANT_USER_ROLE=OWNER \
npm run tenant:admin:create
```

Đà Nẵng:

```bash
TENANT_CODE=da-nang \
ADMIN_EMAIL=admin.danang@example.com \
ADMIN_USERNAME=admin_danang \
ADMIN_PASSWORD=change-me \
ADMIN_DISPLAY_NAME="Admin Đà Nẵng" \
TENANT_USER_ROLE=OWNER \
npm run tenant:admin:create
```

### 5.3. Gán user đã tồn tại vào tenant

```bash
TENANT_CODE=da-nang \
ADMIN_USERNAME=admin_danang \
TENANT_USER_ROLE=ADMIN \
npm run tenant:admin:assign
```

Role tenant hợp lệ:

```txt
OWNER
ADMIN
EDITOR
VIEWER
```

## 6. Lệnh Tạo Tenant Và Dữ Liệu

### 6.1. Seed dữ liệu từ file tenant

Mỗi tenant có thư mục dữ liệu riêng trong `src/scripts/seed-data/tenants/<tenant-code>/`. Bạn có thể truyền `TENANT_CODE` làm đối số (argument) sau lệnh.

> [!IMPORTANT]
> **Lưu ý về cách chạy lệnh với npm**:
> Để truyền đối số qua `npm run` thành công trên mọi môi trường và phiên bản npm, bạn **bắt buộc** phải sử dụng ký tự `--` trước khi điền mã tenant.
> * Ví dụ đúng: `npm run tenant:seed:all -- tien-thang`
> * Nếu không sử dụng `--` (ví dụ: `npm run tenant:seed:all tien-thang`), đối số có thể không được chuyển tiếp tới script gốc, dẫn tới việc hệ thống hiểu là `all` và chạy seed cho **tất cả** các tenant.

Dưới đây là các nhóm lệnh đầy đủ được thiết lập sẵn cho từng tenant để bạn có thể copy-paste trực tiếp:

#### A. Dành cho Tenant: Xã Tiến Thắng (`tien-thang`)

* **Seed toàn bộ dữ liệu (Khuyên dùng)**:
```bash
npm run tenant:seed:all -- tien-thang
```

* **Chạy từng phần cụ thể**:
  * Tạo cấu trúc tenant base (theme, map bounds, area với mã tỉnh/thành phố là `hanoi`):
    ```bash
    npm run tenant:seed:base -- tien-thang
    ```
  * Tạo/gán tài khoản admin của tenant:
    ```bash
    npm run tenant:seed:admins -- tien-thang
    ```
  * Seed Marker Icon và Danh mục địa điểm:
    ```bash
    npm run tenant:seed:categories -- tien-thang
    ```
  * Seed các địa điểm du lịch mẫu:
    ```bash
    npm run tenant:seed:places -- tien-thang
    ```

#### B. Dành cho Tenant: Thành phố Đà Nẵng (`da-nang`)

* **Seed toàn bộ dữ liệu (Khuyên dùng)**:
```bash
npm run tenant:seed:all -- da-nang
```

* **Chạy từng phần cụ thể**:
  * Tạo cấu trúc tenant base (theme, map bounds, area):
    ```bash
    npm run tenant:seed:base -- da-nang
    ```
  * Tạo/gán tài khoản admin của tenant:
    ```bash
    npm run tenant:seed:admins -- da-nang
    ```
  * Seed Marker Icon và Danh mục địa điểm:
    ```bash
    npm run tenant:seed:categories -- da-nang
    ```
  * Seed các địa điểm du lịch mẫu:
    ```bash
    npm run tenant:seed:places -- da-nang
    ```

#### C. Seed toàn bộ các tenant cùng lúc

Để chạy seed dữ liệu cho tất cả các tenant cùng lúc:
```bash
npm run tenant:seed:all
```

hoặc:
```bash
npm run tenant:seed:all -- all
```

### 6.2. Tạo tenant nhanh bằng biến môi trường

Lệnh này vẫn còn để tạo tenant cơ bản khi chưa muốn tạo file seed:

```bash
TENANT_CODE=nha-trang \
TENANT_NAME="Thành phố Nha Trang" \
TENANT_DOMAIN=nha-trang.localhost \
TENANT_AREA_SLUG=nha-trang \
TENANT_AREA_NAME="Thành phố Nha Trang" \
TENANT_PROVINCE_CODE=56 \
TENANT_CENTER_LAT=12.238791 \
TENANT_CENTER_LNG=109.196749 \
TENANT_RADIUS_KM=20 \
npm run tenant:create
```

Lệnh này tạo `Tenant`, feature mặc định và area mặc định. Nó không tạo admin, category, place hoặc boundary GeoJSON từ file tenant mới.

### 6.3. Scripts cũ

Các script cũ vẫn còn để tương thích:

```bash
npm run tenant:seed:local
npm run db:seed:categories
npm run db:seed:areas
npm run db:seed:mock-places
```

Luồng mới nên dùng `tenant:seed:*` vì dữ liệu đã được tách theo tenant.

### 6.4. Xoá dữ liệu của một tenant

Nếu bạn muốn xoá sạch toàn bộ dữ liệu của một tenant cụ thể (bao gồm thông tin tenant, các khu vực, địa điểm du lịch, và danh sách phân quyền admin thuộc tenant đó) mà không muốn ảnh hưởng tới dữ liệu của các tenant khác:

```bash
npm run tenant:delete -- <tenant-code>
```

Ví dụ xoá tenant Tiến Thắng:
```bash
npm run tenant:delete -- tien-thang
```

Lệnh này sử dụng cơ chế **Cascading Delete** trên cơ sở dữ liệu để xoá sạch tất cả các dữ liệu liên quan đến tenant đó một cách an toàn và triệt để.

## 7. Dữ Liệu Default Lưu Ở Đâu

Nguồn dữ liệu seed theo tenant nằm ở:

```txt
src/scripts/seed-data/tenants/
```

Các file chính:

```txt
src/scripts/seed-data/tenants/tien-thang/     <- Thư mục tenant Tiến Thắng
  ├── admins.ts                               <- Định nghĩa admin user cho Tiến Thắng
  ├── places.ts                               <- Địa điểm mẫu của Tiến Thắng
  └── index.ts                                <- Tổng hợp cấu hình tenant, area và mapLayer
src/scripts/seed-data/tenants/da-nang/        <- Thư mục tenant Đà Nẵng
  ├── admins.ts                               <- Định nghĩa admin user cho Đà Nẵng
  ├── places.ts                               <- Địa điểm mẫu của Đà Nẵng (hiện đang trống)
  └── index.ts                                <- Tổng hợp cấu hình tenant, area và mapLayer
src/scripts/seed-data/tenants/shared-categories.ts
src/scripts/seed-data/tenants/index.ts
src/scripts/seed-data/tenants/types.ts
```

Trong mỗi thư mục tenant, cấu trúc được phân rã như sau:
- `admins.ts`: Chứa danh sách user admin tenant, mật khẩu local/demo, role tenant.
- `places.ts`: Chứa danh sách địa điểm mẫu của riêng tenant đó.
- `index.ts`: Chứa thông tin base của tenant bao gồm: code, name, domain, theme, settings, area mặc định, map layer/boundary, và gộp chung với `admins`, `places` cùng categories mặc định.

Muốn thêm tenant mới:

1. Tạo thư mục mới dưới `src/scripts/seed-data/tenants/`, ví dụ: `src/scripts/seed-data/tenants/nha-trang/`.
2. Tạo các file `admins.ts`, `places.ts` và `index.ts` bên trong thư mục đó tương tự như Đà Nẵng hay Tiến Thắng.
3. Thêm import và khai báo tenant mới vào map trong `src/scripts/seed-data/tenants/index.ts`.
4. Chạy lệnh:

```bash
npm run tenant:seed:all -- nha-trang
```

`src/scripts/tenant-script-utils.ts` vẫn còn các helper seed dùng chung. `LOCAL_TENANTS` hiện đọc lại từ `src/scripts/seed-data/tenants/`, nên không cần sửa trực tiếp trong file util này khi thêm tenant mới.

```txt
src/scripts/seed-data/
```

Chứa GeoJSON boundary:

```txt
src/scripts/seed-data/tien-thang.geojson
src/scripts/seed-data/da-nang.geojson
```

Muốn thêm boundary cho tenant mới, thêm file GeoJSON vào đây rồi khai báo `geoJsonFile` trong `tenant.mapLayer` của file tenant tương ứng.

```txt
src/scripts/seed-categories.ts
```

Script legacy seed category global. Luồng mới nên sửa danh mục trong:

```txt
src/scripts/seed-data/tenants/shared-categories.ts
```

hoặc override `categories` ngay trong file tenant riêng.

Lưu ý hiện tại trong DB, `PlaceCategory` vẫn là global catalog, chưa có `tenantId`. Các file tenant giúp tách source seed theo tenant; nếu cần danh mục thật sự khác nhau theo tenant trong database, cần thêm migration `tenantId` cho `PlaceCategory` và cập nhật API filter theo tenant.

```txt
src/scripts/seed-mock-places.ts
```

Script legacy seed địa điểm Tiến Thắng. Luồng mới nên sửa địa điểm trong `places` của từng file tenant:

```txt
src/scripts/seed-data/tenants/tien-thang.ts
src/scripts/seed-data/tenants/da-nang.ts
```

```txt
data_fake/
```

Chứa media mẫu để seed:

```txt
data_fake/image.png
data_fake/video.mp4
```

```txt
.env
```

Chứa thông tin tài khoản `SUPER_ADMIN` mặc định:

```txt
SEED_ADMIN_EMAIL=...
SEED_ADMIN_USERNAME=...
SEED_ADMIN_PASSWORD=...
SEED_ADMIN_DISPLAY_NAME=...
```

## 8. API Kiểm Tra Nhanh

Tenant config:

```bash
curl 'http://localhost:3000/api/v1/tenant/config?tenant=tien-thang'
curl 'http://localhost:3000/api/v1/tenant/config?tenant=da-nang'
```

Map config:

```bash
curl 'http://localhost:3000/api/v1/areas/tien-thang/map-config?tenant=tien-thang'
curl 'http://localhost:3000/api/v1/areas/da-nang/map-config?tenant=da-nang'
```

Danh sách places theo area:

```bash
curl 'http://localhost:3000/api/v1/areas/tien-thang/places?tenant=tien-thang'
curl 'http://localhost:3000/api/v1/areas/da-nang/places?tenant=da-nang'
```

Swagger:

```txt
http://localhost:3000/docs
```

## 9. Quy Tắc Multi-tenant

- Không nhận `tenantId` từ client public để query dữ liệu.
- Public/admin API phải lấy tenant từ `request.tenant`.
- Admin tenant phải có record `TenantUser` active trong tenant hiện tại.
- `SUPER_ADMIN` là quyền hệ thống, không cần membership tenant.
- Slug area/place unique theo tenant, không unique toàn hệ thống.
- Production dùng domain thật; `?tenant=` chỉ dành cho local/demo/ngrok free.

## 10. Test

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## 11. Prisma Engine Offline/Proxy Note

Các script Prisma trong `package.json` giữ portable để chạy được trên macOS/Linux/Render:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

Nếu local bị chặn tải Prisma engine binaries, có thể thêm tạm vào `.env` khi file engine tương ứng đã tồn tại trong `node_modules/@prisma/engines`:

```txt
PRISMA_QUERY_ENGINE_LIBRARY=./node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node
PRISMA_SCHEMA_ENGINE_BINARY=./node_modules/@prisma/engines/schema-engine-darwin-arm64
```

Không hard-code các biến này vào `package.json`, vì deployment Linux cần engine khác.
