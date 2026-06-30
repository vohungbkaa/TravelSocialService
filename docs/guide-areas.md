# Hướng dẫn tính năng: Quản lý Khu vực Bản đồ (Map Areas)

Khu vực bản đồ (Area) đóng vai trò khoanh vùng địa lý cho các địa danh. Mỗi địa danh sẽ thuộc về một khu vực cụ thể để tối ưu hóa việc phân nhóm và tìm kiếm xung quanh vị trí tâm của khu vực đó.

---

## 💾 Kiến trúc Cơ sở Dữ liệu

Mỗi khu vực được định nghĩa bởi các trường thông tin:

* **`id` (Kiểu String):** Mã định danh duy nhất dạng UUID.
* **`name` (Kiểu String):** Tên khu vực (Ví dụ: "Hồ Tây", "Phố cổ Hà Nội").
* **`slug` (Kiểu String - Unique):** Đường dẫn thân thiện dạng SEO (Ví dụ: "ho-tay"). Tự động sinh ra từ tên khu vực.
* **`provinceCode` (Kiểu String?):** Mã tỉnh/thành phố trực thuộc Trung ương (Ví dụ: "01" cho Hà Nội).
* **`centerLat` & `centerLng` (Kiểu Decimal):** Tọa độ kinh độ và vĩ độ trung tâm của khu vực, dùng làm mốc định vị trên bản đồ.
* **`defaultRadiusKm` (Kiểu Decimal - Mặc định là 3km):** Bán kính hoạt động mặc định bao quanh khu vực để tự động giới hạn phạm vi quét địa danh.
* **`published` (Kiểu Boolean - Mặc định là false):** Trạng thái xuất bản. Khu vực chỉ hiển thị ra bản đồ công cộng khi admin chuyển trạng thái này sang `true`.

---

## 📡 Danh sách API Khu vực (`/api/v1/areas` và `/api/v1/admin/areas`)

Hệ thống phân chia API khu vực thành 2 nhóm độc lập:

### 1. Nhóm API Công cộng (Public)
| Phương thức | Đường dẫn | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/areas` | Public | Lấy danh sách các khu vực đã được xuất bản (`published: true`) |
| `GET` | `/areas/:slug/places` | Public | Lấy danh sách toàn bộ các địa danh đã xuất bản thuộc khu vực đó để hiển thị lên bản đồ |

### 2. Nhóm API Quản trị (Admin)
Yêu cầu header Authorization chứa Token của `ADMIN` hoặc `SUPER_ADMIN`:

| Phương thức | Đường dẫn | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/admin/areas` | Lấy danh sách tất cả các khu vực (bao gồm nháp và đã xuất bản) |
| `POST` | `/admin/areas` | Tạo một khu vực bản đồ mới |
| `PATCH` | `/admin/areas/:id` | Cập nhật thông tin khu vực |
| `DELETE` | `/admin/areas/:id` | Xóa khu vực (Chỉ thành công khi không còn ràng buộc khóa ngoại với địa danh nào) |
| `PATCH` | `/admin/areas/:id/publish` | Xuất bản khu vực ra bản đồ công cộng |
| `PATCH` | `/admin/areas/:id/unpublish` | Hạ khu vực xuống dạng bản nháp |

---

## 🛠️ Định dạng Dữ liệu (DTO) khi Tạo khu vực
```json
{
  "name": "Hồ Tây",
  "provinceCode": "01",
  "description": "Khu vực ven hồ thơ mộng tại Hà Nội",
  "centerLat": 21.0584,
  "centerLng": 105.8242,
  "defaultRadiusKm": 3
}
```
*Lưu ý: Tên khu vực (`name`), kinh độ (`centerLat`) và vĩ độ (`centerLng`) là các trường bắt buộc.*
