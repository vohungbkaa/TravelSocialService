# Travel Social Service - Backend (NestJS)

Dự án backend cho mạng xã hội du lịch sử dụng NestJS, Prisma ORM, PostgreSQL và Docker.

---

## Chi phí hạ tầng giai đoạn đầu

Mục tiêu hiện tại là giữ chi phí hạ tầng bằng `0 USD/tháng`.

Level 0 mặc định:

- API: Render Free hoặc môi trường Node.js free tương đương.
- Database: Supabase Free Postgres qua `DATABASE_URL`.
- Media sau này: Cloudflare R2 Free tier.
- Local development: Docker Compose chỉ dùng để chạy PostgreSQL local.

Không cần Redis, Kafka, OpenSearch, Kubernetes, VPS hoặc paid database trong Phase 0.

---

## 🛠️ Yêu cầu hệ thống
* **Node.js**: >= 20.x (Khuyên dùng v20.19.1)
* **Docker & Docker Compose**: Để khởi chạy PostgreSQL local.

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Bước 1: Cài đặt các package phụ thuộc
* **Mục đích**: Tải và cài đặt toàn bộ thư viện bên thứ ba cần thiết (NestJS core, Prisma ORM, Bcrypt, JWT, Passport, class-validator, v.v.) vào thư mục `node_modules` để ứng dụng có thể chạy được.
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường (Environment Variables)
* **Mục đích**: Tạo file `.env` lưu trữ các tham số cấu hình nhạy cảm và linh hoạt của hệ thống (như thông tin đăng nhập database `DATABASE_URL`, khóa bí mật JWT, cổng chạy cổng PORT, cấu hình Media R2, và tài khoản Admin mặc định) cục bộ trên máy mà không bị đẩy lên GitHub/GitLab.
Sao chép file cấu hình mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Mở file `.env` mới tạo và tùy chỉnh các thông số phù hợp với môi trường của bạn.

> [!NOTE]
> File `.env.example` được thiết lập mặc định để kết nối với cơ sở dữ liệu PostgreSQL cục bộ. Khi triển khai production, bạn chỉ cần thay đổi các biến môi trường này (Ví dụ: dùng Supabase Free Postgres).

### Bước 3: Khởi động cơ sở dữ liệu (PostgreSQL)
* **Mục đích**: Khởi chạy hệ quản trị cơ sở dữ liệu PostgreSQL để cung cấp nơi lưu trữ và truy vấn dữ liệu cho ứng dụng (thông tin người dùng, token, địa danh, ảnh,...).
Bạn có thể chọn một trong hai cách khởi động dưới đây tùy theo cách bạn cài đặt PostgreSQL:

#### Cách A: Dùng Homebrew PostgreSQL local (Khuyên dùng cho macOS nếu không dùng Docker)
Nếu bạn đã cài `postgresql@16` qua Homebrew, khởi động dịch vụ bằng lệnh:
```bash
brew services start postgresql@16
```

#### Cách B: Chạy qua Docker Compose
Chạy lệnh Docker Compose sau để khởi động container PostgreSQL chạy ngầm:
```bash
docker compose up -d postgres
```
*Lưu ý: PostgreSQL mặc định sẽ lắng nghe ở cổng `5432`.*

### Bước 4: Khởi tạo schema database với Prisma
* **Mục đích**: Ánh xạ các cấu trúc bảng (models, relations, indexes) định nghĩa trong file `prisma/schema.prisma` vào cơ sở dữ liệu PostgreSQL để khởi tạo các bảng vật lý, đồng thời tự động biên dịch sinh ra bộ thư viện truy vấn dữ liệu type-safe (`Prisma Client`) tương ứng trong `node_modules`.
Sau khi Database ở Bước 3 đã sẵn sàng, chạy lệnh sau:
```bash
npm run prisma:migrate
```

### Bước 5: Tạo tài khoản Admin và Danh mục mặc định (Seeding)
* **Mục đích**: Khởi tạo tài khoản quản trị tối cao (`SUPER_ADMIN`) dựa trên các thông số cấu hình trong file `.env`, tạo danh sách biểu tượng marker (`MarkerIcon`) và thiết lập các danh mục địa danh mặc định (Kiến trúc, Ẩm thực, Văn hóa, Lịch sử, Lễ hội) vào cơ sở dữ liệu để hệ thống sẵn sàng hoạt động.
Chạy hai câu lệnh dưới đây:
```bash
# 1. Tạo tài khoản Admin mặc định
npm run db:seed:admin

# 2. Tạo catalog biểu tượng marker và danh mục địa danh mặc định
npm run db:seed:categories

# 3. Tạo khu vực bản đồ mặc định
npm run db:seed:areas

# 4. Tạo các địa danh mẫu (Đình Bạch Trữ, Đình Phú Mỹ, Mô hình dưa lưới) cùng hình ảnh & video mẫu
npm run db:seed:mock-places
```

> [!NOTE]
> Biểu tượng marker không được hard-code theo tên danh mục hoặc tên địa danh trong client. Bảng `MarkerIcon` lưu `key`, `name`, `iconUrl`, `markerColor`; bảng `PlaceCategory` tham chiếu bằng `markerIconId`. Khi admin thêm biểu tượng marker mới và chọn cho danh mục, web/mobile chỉ cần đọc `category.markerIcon.iconUrl` và `category.markerIcon.markerColor` từ API để hiển thị, không cần sửa code theo từng danh mục hoặc từng ngôn ngữ.

### Bước 5.1: Xoá sạch dữ liệu và làm mới từ đầu (Reset Database)
* **Mục đích**: Khi bạn muốn xóa toàn bộ dữ liệu hiện tại trong các bảng để cấu trúc lại hoặc nạp lại dữ liệu mẫu sạch từ đầu mà không cần xóa database vật lý thủ công.
* **Các bước thực hiện**:
  1. **Reset Database**: Chạy lệnh Prisma để xoá sạch các bảng dữ liệu cũ và khởi tạo lại cấu trúc bảng trống:
     ```bash
     npx prisma migrate reset
     ```
     *(Hệ thống sẽ hiển thị cảnh báo yêu cầu xác nhận: `Are you sure you want to reset your database?`, hãy nhập `y` và nhấn Enter để xác nhận).*

     > [!TIP]
     > Nếu bạn muốn reset nhanh và bỏ qua bước hỏi xác nhận, có thể dùng cờ `--force`:
     > `npx prisma migrate reset --force`
     
  2. **Nạp lại dữ liệu (Seeding)**: Sau khi reset thành công các bảng sẽ bị trống. Bạn hãy chạy lại các lệnh Seeding ở Bước 5 để nạp lại toàn bộ dữ liệu mặc định và dữ liệu mẫu:
     ```bash
     npm run db:seed:admin
     npm run db:seed:categories
     npm run db:seed:areas
     npm run db:seed:mock-places
     ```

     Hoặc dùng một lệnh gộp:
     ```bash
     npm run db:seed:all
     ```

  3. **Reset và nạp lại dữ liệu bằng một lệnh**: Nếu muốn xóa sạch database, migrate lại schema và nạp toàn bộ dữ liệu mặc định ngay lập tức, dùng:
     ```bash
     npm run db:reset:seed
     ```

     > [!WARNING]
     > Lệnh này dùng `prisma migrate reset --force`, sẽ xóa dữ liệu hiện tại mà không hỏi xác nhận. Chỉ dùng với database local/dev hoặc khi chắc chắn muốn làm mới dữ liệu.

### Bước 6: Chạy ứng dụng

#### Chế độ phát triển (Development)
Để chạy dự án với chế độ theo dõi thay đổi (Hot-reload):
```bash
npm run start:dev
```

#### Chế độ sản xuất (Production Build)
```bash
# Biên dịch sang Javascript (nằm trong thư mục /dist)
npm run build

# Chạy ứng dụng sản xuất
npm run start:prod
```

Ứng dụng mặc định chạy tại địa chỉ: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

### Bước 7: Tắt ứng dụng và các dịch vụ đi kèm
Khi muốn dừng dự án, bạn có thể thực hiện các bước sau:

#### A. Tắt ứng dụng NestJS
* **Nếu đang chạy trực tiếp trên terminal (Foreground):** Nhấn tổ hợp phím `Ctrl + C` tại cửa sổ terminal đang chạy.
* **Nếu ứng dụng bị chạy ngầm hoặc bị kẹt cổng (`EADDRINUSE: address already in use`):**
  1. Tìm ID của tiến trình (PID) đang chạy trên cổng `3000`:
     ```bash
     lsof -i :3000
     ```
  2. Tắt tiến trình đó (thay `<PID>` bằng số tìm được ở bước trên, ví dụ `kill 70140`):
     ```bash
     kill <PID>
     ```
     *(Hoặc cưỡng ép tắt bằng `kill -9 <PID>` nếu tiến trình không phản hồi).*

#### B. Tắt cơ sở dữ liệu (PostgreSQL)
Tùy thuộc vào cách bạn khởi động ở Bước 3:
* **Nếu chạy qua Homebrew (macOS):**
  ```bash
  brew services stop postgresql@16
  ```
* **Nếu chạy qua Docker Compose:**
  ```bash
  docker compose down
  ```

---


## 📖 Tài liệu API (Swagger UI)
Sau khi ứng dụng đã khởi động thành công, bạn có thể truy cập tài liệu Swagger tại:
👉 [**http://localhost:3000/docs**](http://localhost:3000/docs)

* Swagger đã được tích hợp sẵn cấu hình bảo mật Bearer Auth (JWT) để test các API yêu cầu quyền đăng nhập.

---

## 📚 Hướng dẫn các Tính năng Chi tiết
Để xem tài liệu thiết kế và hướng dẫn vận hành chi tiết cho từng tính năng, bạn có thể tham khảo:
* 🔐 [Hướng dẫn Xác thực & Phân quyền](file:///Users/hungvovan/Documents/OfMe/TravelSocialService/docs/guide-auth.md)
* 💾 [Hướng dẫn Quản lý Danh mục Địa danh](file:///Users/hungvovan/Documents/OfMe/TravelSocialService/docs/guide-categories.md)
* 🗺️ [Hướng dẫn Quản lý Khu vực Bản đồ](file:///Users/hungvovan/Documents/OfMe/TravelSocialService/docs/guide-areas.md)
* 🏛️ [Hướng dẫn Quản lý Địa danh & Câu chuyện](file:///Users/hungvovan/Documents/OfMe/TravelSocialService/docs/guide-places.md)
* 📁 [Hướng dẫn Tải lên & Lưu trữ Media](file:///Users/hungvovan/Documents/OfMe/TravelSocialService/docs/guide-upload.md)

---

## 🧪 Chạy Kiểm thử (Tests)

### Unit Tests
Kiểm thử các đơn vị logic đơn lẻ:
```bash
npm run test
```

### E2E (End-to-End) Tests
Kiểm thử toàn bộ luồng API (Database đã được mock sẵn trong môi trường test nên không cần chạy Database thật):
```bash
npm run test:e2e
```

### Test Coverage
Xem báo cáo độ phủ của kiểm thử:
```bash
npm run test:cov
```

---

## Prisma engine offline/proxy note

Các script Prisma trong `package.json` được giữ portable để chạy được trên macOS/Linux/Render:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```

Trong trường hợp môi trường local bị chặn khi tải Prisma engine binaries (`binaries.prisma.sh`), có thể thêm tạm các biến sau vào `.env` nếu file engine tương ứng đã tồn tại trong `node_modules/@prisma/engines`:

```txt
PRISMA_QUERY_ENGINE_LIBRARY=./node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node
PRISMA_SCHEMA_ENGINE_BINARY=./node_modules/@prisma/engines/schema-engine-darwin-arm64
```

Không hard-code các biến này vào `package.json`, vì deployment free trên Linux cần engine khác.
