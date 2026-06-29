# Travel Social Service - Backend (NestJS)

Dự án backend cho mạng xã hội du lịch sử dụng NestJS, Prisma ORM, PostgreSQL và Docker.

---

## 🛠️ Yêu cầu hệ thống
* **Node.js**: >= 20.x (Khuyên dùng v20.19.1)
* **Docker & Docker Compose**: Để khởi chạy PostgreSQL local.

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Bước 1: Cài đặt các package phụ thuộc
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường (Environment Variables)
Sao chép file cấu hình mẫu `.env.example` thành `.env`:
```bash
cp .env.example .env
```
Mở file `.env` và tùy chỉnh các thông số kết nối Database, JWT Secrets hoặc Cloudflare R2 nếu cần thiết.

> [!NOTE]
> File `.env` đã được cấu hình mặc định sẵn sàng để kết nối với container PostgreSQL cục bộ của Docker Compose.

### Bước 3: Khởi động cơ sở dữ liệu (PostgreSQL)
Chạy lệnh Docker Compose sau để khởi động cơ sở dữ liệu PostgreSQL cục bộ ở chế độ chạy ngầm (detached mode):
```bash
docker compose up -d postgres
```
*Lưu ý: Database sẽ lắng nghe ở cổng mặc định `5432`.*

### Bước 4: Khởi tạo schema database với Prisma
Sau khi Database đã chạy thành công, chạy lệnh tạo migration và khởi tạo dữ liệu mẫu:
```bash
npm run prisma:migrate
```
*Lệnh này sẽ tự động đọc `DATABASE_URL` trong file `.env`, tạo các bảng cần thiết và cập nhật Prisma Client.*

### Bước 5: Chạy ứng dụng

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

---

## 📖 Tài liệu API (Swagger UI)
Sau khi ứng dụng đã khởi động thành công, bạn có thể truy cập tài liệu Swagger tại:
👉 [**http://localhost:3000/docs**](http://localhost:3000/docs)

* Swagger đã được tích hợp sẵn cấu hình bảo mật Bearer Auth (JWT) để test các API yêu cầu quyền đăng nhập.

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

## 🔒 Ghi chú về Môi trường Proxy MISA (Dành cho nhà phát triển local)
Trong trường hợp bạn chạy dự án đằng sau proxy/firewall của MISA và bị lỗi timeout khi cài đặt/tải Prisma engine binaries (`binaries.prisma.sh`), file `.env` đã được thiết lập sẵn hai biến môi trường cục bộ để bypass:
```txt
PRISMA_QUERY_ENGINE_LIBRARY=./node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node
PRISMA_SCHEMA_ENGINE_BINARY=./node_modules/@prisma/engines/schema-engine-darwin-arm64
```
Các scripts `prisma:generate`, `prisma:migrate`, `prisma:studio` trong `package.json` đã được nhúng sẵn hai biến này để đảm bảo chạy mượt mà ngay cả khi không có kết nối internet ra CDN của Prisma.
