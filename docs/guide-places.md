# Hướng dẫn tính năng: Quản lý Địa danh (Places)

Địa danh (Place) là thực thể cốt lõi của ứng dụng mạng xã hội du lịch, đại diện cho một địa điểm cụ thể (như đền, chùa, quán ăn, quán cà phê, danh lam thắng cảnh). Mỗi địa danh sẽ thuộc về một danh mục (Category) và một khu vực bản đồ (Area).

---

## 💾 Kiến trúc Cơ sở Dữ liệu

Bảng `Place` chứa các thông tin chi tiết phục vụ cho việc hiển thị bản đồ, thuyết minh và trải nghiệm người dùng:

* **Định vị & Địa lý:**
  * `id` (UUID): Khóa chính.
  * `areaId` (UUID?): Khóa ngoại liên kết tới bảng `Area`.
  * `categoryId` (Int): Khóa ngoại liên kết tới bảng `PlaceCategory` (Kiểu số nguyên tự tăng).
  * `latitude` & `longitude` (Decimal?): Tọa độ địa điểm.
  * `address`, `provinceCode`, `districtCode`, `wardCode`: Địa chỉ chi tiết.
* **Thông tin nội dung:**
  * `name` (String): Tên địa danh (Unique slug tương ứng tự tạo từ tên).
  * `summary` (String?): Tóm tắt ngắn gọn.
  * `description` (String?): Mô tả chi tiết hoặc câu chuyện lịch sử.
  * `localTip` (String?): Mẹo tham quan từ người địa phương.
  * `bestTime` (String?): Thời gian lý tưởng để ghé thăm.
* **Chi phí & Thời gian:**
  * `priceLevel` (FREE | LOW | MEDIUM | HIGH): Mức chi phí ước tính.
  * `estimatedMinCost` & `estimatedMaxCost` (Int?): Chi phí tối thiểu và tối đa bằng con số cụ thể.
  * `averageVisitDurationMinutes` (Int?): Thời gian tham quan trung bình (phút).
  * `openingHours` (Json?): Khung giờ mở cửa hàng ngày.
* **Đa phương tiện (Media):**
  * `coverUrl` (String?): Ảnh bìa chính của địa danh.
  * `videoUrl` (String?): Video giới thiệu hoặc review.
  * `audioUrl` (String?): File âm thanh thuyết minh địa danh (TTS).
* **Trạng thái xuất bản:**
  * `status` (DRAFT | PUBLISHED | HIDDEN): Mặc định là `DRAFT` (Bản nháp). Chỉ được hiển thị trên bản đồ công cộng khi chuyển sang `PUBLISHED`.
  * Để được chuyển sang `PUBLISHED`, địa danh bắt buộc phải điền đầy đủ các thông tin tối thiểu gồm: Tên (`name`), danh mục (`categoryId`), tọa độ (`latitude`, `longitude`) và khu vực (`areaId`).

---

## 📡 Danh sách API Địa danh (`/api/v1/places` và `/api/v1/admin/places`)

### 1. Nhóm API Công cộng (Public)
| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/places` | Public | Lấy danh sách địa danh đã xuất bản (`PUBLISHED`). Hỗ trợ tìm kiếm từ khóa `q`, lọc theo `category`, `areaSlug`, `provinceCode`, `priceLevel`, phân trang qua `cursor` và sắp xếp (`newest`, `rating`). |
| `GET` | `/places/:id` | Public | Lấy chi tiết một địa danh bằng UUID. |
| `GET` | `/places/slug/:slug` | Public | Lấy chi tiết địa danh thông qua đường dẫn thân thiện (slug). |
| `GET` | `/places/:id/images` | Public | Lấy bộ sưu tập ảnh phụ (gallery) của địa danh. |

### 2. Nhóm API Quản trị (Admin)
Yêu cầu Token của `ADMIN` hoặc `SUPER_ADMIN`:

| Phương thức | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/admin/places` | Lấy danh sách tất cả địa danh trong hệ thống (gồm cả nháp/ẩn). |
| `GET` | `/admin/places/:id` | Xem chi tiết địa danh (dành cho Admin). |
| `POST` | `/admin/places` | Tạo địa danh mới dưới dạng bản nháp `DRAFT`. |
| `PATCH` | `/admin/places/:id` | Cập nhật thông tin chi tiết địa danh. |
| `DELETE` | `/admin/places/:id` | Xóa địa danh khỏi cơ sở dữ liệu. |
| `PATCH` | `/admin/places/:id/publish` | Phê duyệt xuất bản địa danh lên bản đồ công cộng (Kiểm tra hợp lệ bắt buộc). |
| `PATCH` | `/admin/places/:id/unpublish` | Hạ địa danh về trạng thái bản nháp. |
| `POST` | `/admin/places/:id/images` | Thêm một ảnh mới vào bộ sưu tập ảnh (gallery) của địa danh. |
| `DELETE` | `/admin/places/:id/images/:imageId` | Xóa ảnh trong bộ sưu tập gallery. |
| `PATCH` | `/admin/places/:id/media-links` | Cập nhật nhanh các liên kết phương tiện chính (coverUrl, videoUrl, audioUrl). |
