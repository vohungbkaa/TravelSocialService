# Hướng dẫn tính năng: Quản lý Danh mục Địa danh (Place Categories)

Danh mục địa danh giúp phân loại các địa điểm (ví dụ: Kiến trúc, Ẩm thực, Lịch sử, Lễ hội) để người dùng dễ dàng tìm kiếm, lọc và phân biệt biểu tượng trên bản đồ.

---

## 💾 Kiến trúc Cơ sở Dữ liệu

Bảng `PlaceCategory` được thiết kế linh hoạt hỗ trợ cả danh mục hệ thống mặc định và danh mục do admin/người dùng tự tạo thêm:

* **`id` (Kiểu số nguyên - `Int`):** Là khóa chính tự động tăng (`SERIAL` trong PostgreSQL). Việc sử dụng khóa kiểu số giúp đơn giản hóa việc quản lý khóa ngoại và tối ưu truy vấn.
* **`code` (Kiểu chuỗi - `String?`):**
  * Các danh mục hệ thống mặc định sẽ có mã code viết hoa (ví dụ: `ARCHITECTURE`, `CUISINE`, `CULTURE`, `HISTORY`, `FESTIVAL`). Mã code này giúp các phần logic nghiệp vụ và frontend dễ dàng so khớp để hiển thị icon hoặc màu sắc riêng biệt.
  * Các danh mục do người dùng/admin tự thêm động từ trang quản trị **sẽ không bắt buộc nhập mã code** (lưu giá trị `null`), hệ thống vẫn hoạt động bình thường dựa trên ID tự tăng.
* **`active` (Kiểu boolean - `Boolean`):** Trạng thái hoạt động (`true`/`false`). Admin có thể tạm ẩn một danh mục mà không cần xóa nó khỏi cơ sở dữ liệu.

---

## ⚙️ Danh mục Mặc định (Seed Data)

Khi khởi tạo hệ thống, dự án cung cấp sẵn tệp script seed để nạp các danh mục mặc định:

* **Kiến trúc (`ARCHITECTURE`):** Công trình, nhà cổ, cầu, phố cổ, kiến trúc đặc trưng.
* **Ẩm thực (`CUISINE`):** Món ngon, đặc sản, quán ăn, trải nghiệm ăn uống.
* **Văn hóa (`CULTURE`):** Phong tục, đời sống địa phương, làng nghề, sinh hoạt truyền thống.
* **Lịch sử (`HISTORY`):** Di tích, bảo tàng, địa danh gắn với sự kiện lịch sử.
* **Lễ hội (`FESTIVAL`):** Lễ hội dân gian, sự kiện văn hóa, hoạt động cộng đồng.
* **Chưa phân loại (`uncategorized`):** Danh mục mặc định khi người dùng không chọn phân loại nào.

*Lưu ý: Lệnh chạy nạp danh mục mặc định: `npm run db:seed:categories`.*

---

## 📡 Danh sách API Danh mục (`/api/v1/place-categories`)

| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/place-categories` | Public | Lấy danh sách toàn bộ danh mục đang hoạt động (`active: true`) |
| `GET` | `/place-categories/admin` | Admin | Lấy danh sách tất cả danh mục (bao gồm cả danh mục đã ẩn) |
| `POST` | `/place-categories` | Admin | Tạo danh mục mới. Chỉ yêu cầu tên (`name`), mã (`code`) và mô tả (`description`) là tùy chọn |
| `PATCH` | `/place-categories/:id` | Admin | Bật/Tắt trạng thái hoạt động của danh mục. Tham số `:id` là số nguyên tự tăng của danh mục |

### Định dạng Dữ liệu (DTO) khi Tạo mới:
```json
{
  "name": "Tên danh mục mới",
  "code": "MA_DANH_MUC", // Tùy chọn, có thể bỏ qua hoặc gửi null/chuỗi rỗng
  "description": "Mô tả ngắn gọn về danh mục" // Tùy chọn
}
```
