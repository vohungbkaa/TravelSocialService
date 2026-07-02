# Hướng dẫn Triển khai & Cấu hình Môi trường Public API (Free Tier)

Tài liệu này hướng dẫn cách thiết lập môi trường chạy thử nghiệm API ổn định cho các nhà phát triển Mobile (Mobile Devs) sử dụng, trong khi bạn vẫn có thể tiếp tục phát triển (code) trên máy cá nhân mà không gây ảnh hưởng hay gián đoạn.

---

## Giải pháp Tổng quan

Để giải quyết vấn đề gián đoạn code khi làm việc nhóm, chúng ta sử dụng mô hình **Tách biệt môi trường Development và Stable**:

1. **Môi trường Development (Máy local của bạn):**
   - Chạy trên port local (ví dụ: `3000` hoặc `3001`).
   - Sử dụng database PostgreSQL local (Docker).
   - Thỏa sức sửa code, test tính năng mới, server có restart/lỗi cú pháp cũng không ảnh hưởng đến người khác.

2. **Môi trường Stable (Môi trường Test cho Mobile Dev):**
   - Được triển khai (deploy) lên nền tảng Cloud Miễn phí (Render + Neon).
   - Tự động đồng bộ hóa với nhánh `main` hoặc `staging` khi bạn hoàn thành và đẩy code lên GitHub.
   - Có URL public cố định dạng HTTPS (không cần chạy ngrok liên tục trên máy của bạn).

---

## Phần 1: Triển khai Môi trường Stable lên Cloud (Free)

Chúng ta sẽ kết hợp **Render.com** (Hosting cho NestJS app) và **Neon.tech** (Hosting cho PostgreSQL Database) để chạy miễn phí và ổn định.

### Bước 1: Tạo Database PostgreSQL trên Neon.tech

Vì gói Database Free của Render sẽ tự động xóa sau 90 ngày, **Neon.tech** là lựa chọn thay thế hoàn hảo (PostgreSQL miễn phí vô thời hạn cho gói Basic).

1. Truy cập [Neon.tech](https://neon.tech/) và đăng nhập bằng tài khoản GitHub.
2. Tạo một dự án mới (Create a project).
3. Đặt tên (ví dụ: `travel-social-db`) và chọn Region gần nhất (ví dụ: `Singapore` hoặc `Asia Pacific`).
4. Sau khi tạo xong, Neon sẽ hiển thị đường dẫn kết nối (**Connection String**).
5. Hãy copy chuỗi kết nối này (dạng: `postgresql://neondb_owner:...@ep-cool-pool-...ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).

### Bước 2: Cấu hình NestJS thích ứng môi trường Cloud

Trong mã nguồn dự án, bạn cần đảm bảo các cấu hình sau hoạt động tốt trên production:

1. **Cổng mạng (Port):**
   Đảm bảo file `src/main.ts` lấy PORT từ biến môi trường của Cloud thay vì fix cứng `3000`:
   ```typescript
   // src/main.ts
   const port = process.env.PORT || 3000;
   await app.listen(port);
   ```

2. **Script khởi chạy:**
   Trong `package.json`, đảm bảo có đủ các script build và start:
   ```json
   "build": "nest build",
   "start:prod": "node dist/main"
   ```

### Bước 3: Đăng ký và Thiết lập Web Service trên Render.com

1. Truy cập [Render.com](https://render.com/) và đăng nhập thông qua tài khoản GitHub.
2. Nhấp vào **New +** -> Chọn **Web Service**.
3. Kết nối với Repository GitHub của dự án `TravelSocialService`.
4. Cấu hình các thông số cơ bản:
   - **Name:** `travel-social-backend` (hoặc tên tùy chọn)
   - **Region:** Chọn khu vực gần châu Á (ví dụ: `Singapore` hoặc `Oregon`).
   - **Branch:** `main` (hoặc nhánh stable của bạn, ví dụ: `staging`).
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build && npx prisma generate`
   - **Start Command:** `npm run start:prod`
   - **Instance Type:** Chọn **Free** (0$/month).

5. Nhấp vào nút **Advanced** bên dưới để thêm các biến môi trường (**Environment Variables**):
   
   | Key | Value | Ghi chú |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Chạy ứng dụng dưới chế độ prod. |
   | `PORT` | `10000` | Render mặc định sẽ cấp port này, NestJS sẽ tự lắng nghe. |
   | `DATABASE_URL` | *[Dán link kết nối Neon.tech ở Bước 1]* | Chuỗi kết nối đến Database online. |
   | `JWT_ACCESS_SECRET` | *[Chuỗi bí mật của bạn]* | Dùng để sinh Access Token. |
   | `JWT_REFRESH_SECRET`| *[Chuỗi bí mật của bạn]* | Dùng để sinh Refresh Token. |
   | `STORAGE_PROVIDER` | `r2` (Khuyên dùng) hoặc `local` | Đọc thêm phần lưu ý lưu trữ bên dưới. |

6. Chọn **Create Web Service**. Hệ thống sẽ tự động pull code từ GitHub về, build ứng dụng và deploy.
7. Khi trạng thái chuyển sang **Live**, bạn sẽ nhận được một domain HTTPS ở phía góc trên bên trái màn hình (ví dụ: `https://travel-social-backend.onrender.com`). Gửi link này cho Mobile Devs.

---

## Phần 2: Giải pháp chạy song song 2 bản local (Nếu không muốn Deploy Cloud)

Nếu chưa muốn đưa lên Cloud và vẫn muốn dùng ngrok chạy trực tiếp trên máy của mình, bạn có thể chạy song song 2 server local trên 2 cổng mạng (Port) khác nhau:

### 1. Sử dụng Git Worktree để tách biệt thư mục code
Thay vì clone dự án thành 2 folder thủ công, bạn sử dụng lệnh `git worktree` của Git để tạo một thư mục làm việc thứ 2 dùng chung một bộ nhớ local:

```bash
# Đứng tại thư mục dự án hiện tại (đang ở nhánh development)
# Tạo một worktree mới trỏ vào nhánh main (hoặc staging) ở thư mục song song
git worktree add ../TravelSocialService-stable main
```

Lúc này bạn sẽ có 2 thư mục ngang hàng nhau:
* `TravelSocialService` (Bản bạn đang code, sửa đổi liên tục)
* `TravelSocialService-stable` (Bản chạy ổn định cho mobile dev dùng)

### 3. Thiết lập cấu hình chạy song song

1. **Với thư mục Stable (`TravelSocialService-stable`):**
   - Copy file `.env` sang thư mục này.
   - Sửa file `.env` đổi `PORT` thành `8000`.
   - Chạy lệnh khởi động: `npm run start:prod` hoặc `npm run start`.
   - Bật ngrok trỏ vào port này: `ngrok http 8000`. Gửi link ngrok này cho mobile dev.

2. **Với thư mục Dev (`TravelSocialService` - nơi bạn đang code):**
   - File `.env` để `PORT=3000` (hoặc cổng khác cổng 8000).
   - Chạy lệnh dev: `npm run start:dev` (chế độ watch/hot-reload).
   - Bạn truy cập, test API local thông qua `http://localhost:3000`.

*Mỗi khi bạn đã hoàn thành code bên thư mục Dev, hãy commit và merge vào nhánh `main`. Sau đó sang thư mục Stable, gõ `git pull` để cập nhật bản mới cho mobile dev (mất chưa đầy 5 giây, không làm đứt quãng công việc của họ lâu).*

---

## ⚠️ Lưu ý quan trọng khi chạy Production/Cloud Free

### 1. Vấn đề "Ngủ đông" (Cold Start) của Render Free
* Với gói free của Render, nếu service không nhận được request nào trong vòng **15 phút**, nó sẽ chuyển sang chế độ ngủ đông.
* Khi có request tiếp theo gửi tới (ví dụ: khi dev mobile bật app lên test), Render sẽ cần **30 đến 50 giây** để khởi động lại container backend.
* **Cách khắc phục:** 
  - Bảo dev mobile kiên nhẫn đợi một chút ở request đầu tiên trong ngày.
  - Hoặc thiết lập một cron job (dùng các dịch vụ free như *cron-job.org* hoặc *UptimeRobot*) để gửi request ping đến endpoint API `/` (hoặc `/health`) mỗi 10 phút một lần nhằm "giữ ấm" server.

### 2. Lưu trữ file ảnh (Upload Files)
* Môi trường deploy trên Render Free là **Ephemeral file system** (hệ thống file tạm thời). Mỗi lần backend được deploy lại hoặc khởi động lại sau khi ngủ đông, mọi file ảnh do người dùng upload lên thư mục local `uploads/` sẽ bị **xóa sạch**.
* **Giải pháp:** Bạn cần cấu hình `STORAGE_PROVIDER=r2` trong `.env` để lưu trữ ảnh trực tiếp lên **Cloudflare R2** hoặc **Supabase Storage** (cả hai đều có gói free 10GB lưu trữ rất tốt).
