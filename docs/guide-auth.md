# Hướng dẫn tính năng: Xác thực & Phân quyền (Authentication & Authorization)

Hệ thống sử dụng cơ chế xác thực dựa trên JSON Web Token (JWT) kết hợp giữa **Access Token** ngắn hạn và **Refresh Token** dài hạn, đi kèm cơ chế phân quyền theo vai trò (Role-based Access Control - RBAC).

---

## 🔐 Cơ chế hoạt động của Tokens

1. **Access Token (JWT):**
   * Được gửi kèm ở header của các HTTP request yêu cầu đăng nhập dưới dạng: `Authorization: Bearer <access_token>`.
   * Thời hạn mặc định: `15 phút` (Có thể tùy chỉnh qua `JWT_ACCESS_TTL` trong `.env`).
2. **Refresh Token:**
   * Dùng để cấp lại Access Token mới khi Access Token cũ hết hạn mà người dùng không cần đăng nhập lại.
   * Thời hạn mặc định: `30 ngày` (Có thể tùy chỉnh qua `JWT_REFRESH_TTL` trong `.env`).
   * Được mã hóa băm (hashed) trước khi lưu vào bảng `RefreshToken` trong database để đảm bảo an toàn bảo mật.

---

## 👥 Vai trò người dùng (Roles)

Hệ thống phân chia thành 3 vai trò chính (định nghĩa trong `UserRole` enum ở Prisma Schema):
* **`USER`:** Người dùng phổ thông. Có thể xem các thông tin địa danh công khai, bản đồ khu vực.
* **`ADMIN`:** Quản trị viên. Có quyền tạo/chỉnh sửa/phê duyệt địa danh, khu vực, danh mục.
* **`SUPER_ADMIN`:** Quản trị tối cao. Ngoài các quyền của Admin, có quyền cấu hình hệ thống, tạo tài khoản Admin khác, v.v.

---

## 🛠️ Cấu trúc lập trình trong Code

### 1. Đánh dấu API công khai
Mặc định, toàn bộ API của hệ thống đều yêu cầu đăng nhập do `JwtAuthGuard` được áp dụng làm Guard toàn cục (`global guard`).
Để cho phép một API có thể truy cập tự do (không cần token), sử dụng decorator `@Public()`:
```typescript
import { Public } from '../common/decorators/public.decorator';

@Get('public-info')
@Public()
async getPublicInfo() {
  return "Mọi người đều xem được";
}
```

### 2. Phân quyền trên Route (RBAC)
Để giới hạn API chỉ cho phép các vai trò cụ thể truy cập, kết hợp decorator `@Roles()` cùng với Guard:
```typescript
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Post('admin-only')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
async doAdminWork() {
  return "Chỉ Admin và Super Admin xem được";
}
```

---

## 📡 Danh sách API Xác thực (`/api/v1/auth`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản người dùng mới |
| `POST` | `/auth/login` | Public | Đăng nhập bằng `phone`/`username`/`email` và `password`. Trả về token và thông tin user |
| `POST` | `/auth/google` | Public | Xác minh Google ID token, tạo/liên kết tài khoản và trả về token của hệ thống |
| `POST` | `/auth/facebook` | Public | Xác minh Facebook access token, tạo/liên kết tài khoản và trả về token của hệ thống |
| `POST` | `/auth/refresh` | Public | Gửi `refreshToken` để lấy lại cặp `accessToken` & `refreshToken` mới |
| `POST` | `/auth/logout` | Đã đăng nhập | Đăng xuất, hủy bỏ Refresh Token hiện tại trong database |
| `GET` | `/auth/me` | Đã đăng nhập | Lấy thông tin cá nhân của tài khoản đang đăng nhập |
