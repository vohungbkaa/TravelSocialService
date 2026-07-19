# Hướng dẫn tính năng: Xác thực & Phân quyền (Authentication & Authorization)

Hệ thống sử dụng cơ chế xác thực dựa trên JSON Web Token (JWT) kết hợp giữa **Access Token** ngắn hạn và **Refresh Token** dài hạn, đi kèm cơ chế phân quyền theo vai trò (Role-based Access Control - RBAC).

---

## 🔐 Cơ chế hoạt động của Tokens

1. **Access Token (JWT):**
   * Được gửi kèm ở header của các HTTP request yêu cầu đăng nhập dưới dạng: `Authorization: Bearer <access_token>`.
   * Thời hạn mặc định: `7 ngày` (Có thể tùy chỉnh qua `JWT_ACCESS_TTL` trong `.env`).
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
| `POST` | `/auth/logout` | Public | Đăng xuất, hủy bỏ Refresh Token hiện tại trong database |

---

## Luồng xác thực giữa Flutter và Backend

### Kiến trúc phía Flutter

Luồng gọi được phân tầng như sau:

```text
LoginScreen (BaseScreen<LoginViewModel>)
  -> LoginViewModel
     -> GoogleLoginInteractor / FacebookLoginInteractor / AppLoginInteractor
        -> Provider SDK (Google/Facebook)
        -> AuthServerRepository
           -> AuthApiService (Retrofit + Dio)
        -> AuthSessionManager
           -> AuthLocalRepository -> AuthLocalService (SharedPreferences)
           -> InMemoryAuthTokenProvider
     -> AuthInteractor (skip login và trạng thái session)

AuthInteractor
  -> AuthSessionCoordinator (restore, refresh và logout)

AuthInterceptor
  -> AuthSessionCoordinator (proactive refresh và xử lý 401)

AuthSessionCoordinator
  -> AuthServerRepository (refresh/logout)
  -> AuthSessionManager (session local và token trong bộ nhớ)
```

- `LoginScreen` chỉ nhận thao tác người dùng, quan sát `LoginViewState`, hiển thị loading/lỗi và điều hướng sau khi đăng nhập thành công.
- `LoginViewModel` chống gửi đồng thời nhiều yêu cầu, gọi trực tiếp interactor tương ứng và chuyển mã lỗi backend thành string hiển thị.
- Mỗi login interactor là một use case hoàn chỉnh: lấy credential hoặc dữ liệu nhập, gọi backend và giao session cho `AuthSessionManager` lưu.
- `AuthSessionManager` là đầu mối duy nhất đồng bộ session giữa `AuthLocalRepository` và `InMemoryAuthTokenProvider`.
- `AuthSessionCoordinator` chống nhiều request refresh đồng thời, rotate session và tuần tự hóa refresh với logout.
- `AuthInteractor` chỉ quản lý trạng thái xác thực dùng chung: restore session, logout, skip login và thông tin user lấy từ JWT.
- `AuthServerRepository` gửi request, kiểm tra cấu trúc response và chuyển lỗi HTTP thành `AuthException`.

### Request và response chung

Google và Facebook gửi cùng cấu trúc body, nhưng giá trị `token` có loại khác nhau:

```json
{
  "token": "provider-token"
}
```

App login gửi identifier là số điện thoại, email hoặc username:

```json
{
  "identifier": "+84901234567",
  "password": "user-password"
}
```

Khi đăng nhập thành công, cả ba endpoint trả cùng một cấu trúc:

```json
{
  "data": {
    "accessToken": "backend-jwt",
    "refreshToken": "opaque-refresh-token",
    "user": {
      "id": "user-uuid",
      "username": "username",
      "displayName": "Display Name",
      "role": "USER"
    }
  }
}
```

Payload của `accessToken` chứa:

```json
{
  "sub": "user-uuid",
  "username": "username",
  "role": "USER",
  "tenantRoles": [
    { "tenantId": "tenant-uuid", "role": "ADMIN" }
  ],
  "displayName": "Display Name",
  "avatar": "avatar-url-or-media-id",
  "iat": 0,
  "exp": 0
}
```

Response lỗi được chuẩn hóa bởi `HttpExceptionFilter`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "INVALID_GOOGLE_TOKEN"
  }
}
```

Trong đó `error.code` là nhóm lỗi HTTP, còn `error.message` là mã nghiệp vụ mà Flutter dùng để chọn thông báo phù hợp.

---

## Đăng nhập Google

### Client gửi gì lên backend

1. Người dùng bấm nút Google trong `LoginScreen`.
2. `LoginViewModel.loginWithGoogle()` gọi `GoogleLoginInteractor.login()`.
3. `GoogleLoginInteractor` gọi `GoogleSignIn.instance.authenticate()` với scope email.
4. Google SDK trả `GoogleSignInAccount`. Client lấy:
   - `account.authentication.idToken`: gửi lên backend.
   - `displayName`, `email`, `photoUrl`: chỉ dùng làm `SocialLoginCredential` phía client và hiển thị lời chào; backend không tin các field profile do client tự gửi.
5. `AuthServerRepository` gọi:

```http
POST /api/v1/auth/google
Content-Type: application/json

{
  "token": "google-id-token"
}
```

### Backend xử lý

1. `GoogleTokenVerifier` đọc danh sách audience hợp lệ từ `GOOGLE_CLIENT_IDS`.
2. `google-auth-library` xác minh chữ ký, issuer, thời hạn và audience của ID token.
3. Backend yêu cầu token có `sub`; nếu có email thì `email_verified` phải bằng `true`.
4. Token hợp lệ được chuyển thành profile tin cậy gồm `providerUserId`, `displayName`, `email` và `avatarUrl`.
5. `AuthService` tìm `SocialAuthIdentity` theo cặp `(GOOGLE, providerUserId)`:
   - Nếu đã tồn tại: lấy user đã liên kết.
   - Nếu chưa có nhưng email đã thuộc một user: tạo identity và liên kết vào user đó.
   - Nếu chưa có user: tạo `User`, `UserProfile` và `SocialAuthIdentity` trong transaction.
6. Backend kiểm tra user không bị `DELETED` hoặc `SUSPENDED`, sau đó phát access token và refresh token.

### Dữ liệu được lưu

- `User`: email Google, username tự sinh dạng `google_<hash>`, `passwordHash = null`, `status = ACTIVE`, `role = USER`.
- `UserProfile`: `displayName` và `avatarMediaId` lấy từ profile Google khi tạo user mới.
- `SocialAuthIdentity`: `provider = GOOGLE`, Google `sub` trong `providerUserId`, và `userId` nội bộ.
- `RefreshToken`: chỉ lưu SHA-256 hash của refresh token, `userId`, thời hạn và trạng thái revoke.
- Google ID token không được lưu trong database.

### Client nhận và xử lý

`AuthServerRepository` parse response thành `AuthSession`. `GoogleLoginInteractor` giao session cho `AuthSessionManager` để lưu local và cập nhật `InMemoryAuthTokenProvider`, rồi trả `SocialAuthResult(displayName)` cho UI. `LoginScreen` hiển thị lời chào rồi mở `redirectPath`, pop màn hình hiện tại hoặc chuyển tới News.

Các mã lỗi chính: `GOOGLE_AUTH_NOT_CONFIGURED`, `INVALID_GOOGLE_TOKEN`, `GOOGLE_EMAIL_NOT_VERIFIED`, `USER_SUSPENDED`.

---

## Đăng nhập Facebook

### Client gửi gì lên backend

1. Người dùng bấm nút Facebook.
2. `FacebookLoginInteractor` gọi `FacebookAuth.instance.login()`.
3. SDK trả Facebook access token. Client có đọc thêm `name`, `email`, `picture` để tạo `SocialLoginCredential`, nhưng chỉ access token được gửi lên backend.
4. `AuthServerRepository` gọi:

```http
POST /api/v1/auth/facebook
Content-Type: application/json

{
  "token": "facebook-access-token"
}
```

### Backend xử lý

1. Backend yêu cầu `FACEBOOK_APP_ID` và `FACEBOOK_APP_SECRET`.
2. `FacebookTokenVerifier` gọi Graph API `/debug_token` bằng app access token để kiểm tra user token còn hợp lệ và thuộc đúng Facebook App ID.
3. Backend gọi Graph API `/me?fields=id,name,email,picture.type(large)` bằng user access token.
4. ID từ `/me` phải trùng `user_id` đã được `/debug_token` xác minh.
5. Profile tin cậy được đưa qua cùng quy trình tìm/liên kết/tạo user như Google, nhưng provider là `FACEBOOK`.
6. Facebook có thể không trả email. Khi đó backend vẫn tạo user dựa trên `providerUserId`, với `User.email = null`.

### Dữ liệu được lưu

- `User`: email nếu Facebook cung cấp, username tự sinh dạng `facebook_<hash>`, `passwordHash = null`, trạng thái và role mặc định.
- `UserProfile`: tên hiển thị và URL avatar khi tạo mới.
- `SocialAuthIdentity`: `provider = FACEBOOK`, Facebook user ID trong `providerUserId`, và `userId` nội bộ.
- `RefreshToken`: lưu hash giống các loại login khác.
- Facebook access token và App Secret không được lưu trong database.

### Client nhận và xử lý

`FacebookLoginInteractor` xử lý response thành `AuthSession` và lưu qua `AuthSessionManager` giống Google. Nếu người dùng đóng Facebook SDK, `LoginCancelledException` được trả về và UI không hiển thị lỗi.

Các mã lỗi chính: `FACEBOOK_AUTH_NOT_CONFIGURED`, `INVALID_FACEBOOK_TOKEN`, `USER_SUSPENDED`.

---

## App login bằng phone, email hoặc username

### Client gửi gì lên backend

`AppLoginInteractor.login(identifier, password)` chuyển nguyên identifier sang repository. Backend chấp nhận:

- Số điện thoại, ví dụ `+84901234567` hoặc `+84 901 234 567`.
- Email.
- Username.

Request:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "identifier": "+84901234567",
  "password": "user-password"
}
```

### Backend xử lý

1. Identifier được trim và chuyển lowercase để tìm email/username.
2. Nếu identifier có dạng số điện thoại, backend loại bỏ khoảng trắng, dấu chấm, ngoặc và dấu gạch trước khi tìm `User.phone`.
3. Backend tìm user theo `email OR username OR phone`.
4. User phải có `passwordHash`, không bị xóa hoặc tạm khóa.
5. Password được kiểm tra bằng `bcrypt.compare()`.
6. Thành công thì backend phát cùng loại access token và refresh token như social login.

### Dữ liệu được lưu

App login không tạo hoặc thay đổi `User`/`UserProfile`. Dữ liệu tài khoản đã được tạo từ đăng ký hoặc seed:

- `User.email`, `User.phone`, `User.username`.
- `User.passwordHash`: bcrypt hash, không lưu password gốc.
- `User.status`, `User.role`.
- `UserProfile`: tên hiển thị và dữ liệu hồ sơ.

Mỗi lần đăng nhập thành công chỉ tạo thêm một bản ghi `RefreshToken`.

### Client nhận và xử lý

`AppLoginInteractor.login(identifier, password)` gọi backend, sau đó lưu `AuthSession` qua `AuthSessionManager` và cập nhật access token giống social login. Mã lỗi chính là `INVALID_CREDENTIALS` và `USER_SUSPENDED`.

Hiện tại `AppLoginInteractor`, `LoginViewModel.loginWithApp()` và backend đã sẵn sàng cho phone/email/username, nhưng `LoginScreen` chưa có form app login. Màn hình hiện chỉ có Google, Facebook và bỏ qua đăng nhập.

---

## Các bảng dữ liệu liên quan

| Bảng | Dữ liệu auth quan trọng | Khi nào ghi dữ liệu |
| :--- | :--- | :--- |
| `User` | `email`, `phone`, `username`, `passwordHash`, `status`, `role` | Register hoặc lần social login đầu tiên nếu chưa có user |
| `UserProfile` | `displayName`, `avatarMediaId` và các field hồ sơ | Register hoặc lần social login đầu tiên |
| `SocialAuthIdentity` | `provider`, `providerUserId`, `userId` | Lần đầu một Google/Facebook identity được liên kết |
| `RefreshToken` | `userId`, `tokenHash`, `expiresAt`, `revokedAt` | Mỗi lần login hoặc rotate refresh token |
| `TenantUser` | `tenantId`, `userId`, tenant role | Không ghi trong login; được đọc để đưa `tenantRoles` vào JWT |

Access token JWT không được lưu trong database. Provider token cũng không được lưu. Chỉ refresh token hash được lưu phía server.

---

## Vòng đời session phía Flutter

Sau khi nhận response đăng nhập:

1. `AuthServerRepository` tạo `AuthSession(accessToken, refreshToken, userId)`.
2. Login interactor giao session cho `AuthSessionManager`.
3. `AuthSessionManager` đặt access token vào `InMemoryAuthTokenProvider` và yêu cầu `AuthLocalRepository` lưu ba key trong `SharedPreferences`:
   - `access_token`
   - `refresh_token`
   - `user_id`
4. Trước mỗi request cần xác thực, `AuthInterceptor` yêu cầu `AuthSessionCoordinator` kiểm tra thời hạn access token. Nếu token còn dưới 30 phút, coordinator refresh trước khi gửi request.
5. Các request đồng thời dùng chung một refresh Future, vì vậy backend chỉ nhận một request `/auth/refresh`; sau đó tất cả request tiếp tục với access token mới.
6. Khi app khởi động, `AuthInteractor.initAuth()` cũng restore và refresh qua cùng coordinator.
7. Nếu API vẫn trả `401`, interceptor force refresh một lần và retry request một lần. Response `401` cũ không tạo thêm refresh nếu token trong bộ nhớ đã thay đổi.
8. `INVALID_REFRESH_TOKEN` hoặc `USER_SUSPENDED` xóa session và mở luồng đăng nhập; lỗi mạng/5xx giữ session hiện tại.

Response refresh chỉ có `accessToken` và `refreshToken`; client giữ lại `userId` từ session cũ.

### Logout

Flutter gửi refresh token hiện tại tới `/auth/logout`, sau đó luôn xóa session local và access token trong bộ nhớ. Nếu refresh đang chạy, logout chờ rotate hoàn thành rồi revoke refresh token mới nhất, tránh việc refresh ghi session trở lại sau khi người dùng đã đăng xuất.

---

## Trạng thái triển khai và cấu hình bắt buộc

- Google iOS đã có OAuth client ID; backend phải khai báo đúng audience trong `GOOGLE_CLIENT_IDS` ở mọi môi trường deploy.
- Google Android cần OAuth Android configuration phù hợp, bao gồm package name/SHA-1 và cấu hình native tương ứng.
- Facebook cần App ID/Client Token thật phía mobile và `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` thật phía backend. Không đưa App Secret vào Flutter.
- App login chỉ thành công với user có `passwordHash`; tài khoản chỉ tạo bằng social provider không thể dùng password cho tới khi có luồng đặt mật khẩu.
- Register UI Flutter hiện chưa gọi API register; dữ liệu phone/password phải tồn tại ở backend trước khi app login có thể dùng.
- `/auth/me` hiện chưa được triển khai trong `AuthController`.
