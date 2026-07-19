# Báo cáo chi phí hạ tầng vận hành TravelSocial

## 1. Mục tiêu

Báo cáo này trình bày chi phí hạ tầng dự kiến để triển khai hệ thống TravelSocial cho phạm vi 1 xã. Phương án được lựa chọn ưu tiên chi phí thấp ở giai đoạn đầu, đồng thời vẫn đảm bảo hệ thống có thể vận hành ổn định và có khả năng nâng cấp khi số lượng người dùng tăng lên.

## 2. Phương án hạ tầng đề xuất

Hệ thống sử dụng các dịch vụ cloud phổ biến, chi phí thấp và có thể mở rộng theo nhu cầu:

| Hạng mục | Dịch vụ đề xuất | Vai trò |
|---|---|---|
| Backend API | Render | Chạy hệ thống backend |
| Cơ sở dữ liệu | Neon PostgreSQL | Lưu dữ liệu người dùng, bài viết, địa điểm, tin tức, shop |
| Lưu trữ media | Cloudflare R2 | Lưu ảnh/video upload |
| DNS/CDN | Cloudflare | Quản lý domain, cache và phân phối nội dung |

Lý do chọn phương án này:

- Chi phí khởi điểm thấp.
- Backend không bị sleep ở gói Render Starter.
- Dữ liệu media không lưu trực tiếp trên server nên tránh mất file khi deploy/restart.
- Có thể nâng cấp từng phần khi nhu cầu sử dụng tăng.
- Phù hợp với kiến trúc hiện tại của hệ thống.

## 3. Tổng quan báo giá

Chi phí dưới đây là chi phí hạ tầng cloud hàng tháng, chưa bao gồm chi phí phát triển phần mềm, vận hành nhân sự, domain trả phí hoặc các dịch vụ SMS/email nếu phát sinh sau này.

Tỷ giá tạm tính: 1 USD ~ 26.000 VND.

| Giai đoạn | Mục tiêu sử dụng | Tổng USD/tháng | Tổng VND/tháng |
|---|---|---:|---:|
| Giai đoạn 1 | Pilot rẻ nhất nhưng chạy ổn | $10 | 260.000 VND |
| Giai đoạn 2 | Một xã dùng thật | $30 | 780.000 VND |
| Giai đoạn 3 | Vận hành ổn định | $70 | 1.820.000 VND |

## 4. Chi tiết từng giai đoạn

### Giai đoạn 1: Pilot rẻ nhất nhưng chạy ổn

Giai đoạn này phù hợp để triển khai ban đầu cho 1 xã, số lượng người dùng chưa lớn, ưu tiên chi phí thấp nhưng backend vẫn hoạt động ổn định.

| Hạng mục | Dịch vụ/Gói | Chi phí USD/tháng | Quy đổi VND/tháng |
|---|---|---:|---:|
| Chạy backend | Render Starter | $7 | 182.000 VND |
| Cơ sở dữ liệu | Neon Free | $0 | 0 VND |
| Lưu trữ ảnh/video | Cloudflare R2 dưới 10GB | $0 | 0 VND |
| DNS/CDN | Cloudflare Free | $0 | 0 VND |
| Dự phòng vận hành | Tỷ giá, request và usage nhỏ | $3 | 78.000 VND |
| **Tổng phí hạ tầng** |  | **$10** | **260.000 VND** |

Phù hợp khi:

- 100-500 người dùng hoạt động mỗi ngày.
- Chủ yếu xem tin tức, địa điểm, shop, bài viết.
- Tổng dung lượng media dưới 10GB.

### Giai đoạn 2: Một xã dùng thật

Giai đoạn này áp dụng khi người dân bắt đầu sử dụng thường xuyên hơn, có đăng bài, upload ảnh và video ngắn.

| Hạng mục | Dịch vụ/Gói | Chi phí USD/tháng | Quy đổi VND/tháng |
|---|---|---:|---:|
| Chạy backend | Render Starter | $7 | 182.000 VND |
| Cơ sở dữ liệu | Neon usage-based | $15 | 390.000 VND |
| Lưu trữ ảnh/video | Cloudflare R2 10-100GB | $2 | 52.000 VND |
| DNS/CDN | Cloudflare Free | $0 | 0 VND |
| Dự phòng vận hành | Tỷ giá, query tăng và media tăng nhẹ | $6 | 156.000 VND |
| **Tổng phí hạ tầng** |  | **$30** | **780.000 VND** |

Phù hợp khi:

- 500-3.000 tài khoản đã đăng ký.
- 200-1.000 người dùng hoạt động mỗi ngày.
- 10.000-80.000 lượt gọi API mỗi ngày.
- 10-100GB ảnh/video.

### Giai đoạn 3: Vận hành ổn định

Giai đoạn này áp dụng khi hệ thống đã được sử dụng chính thức, có nhiều dữ liệu hơn và cần hiệu năng ổn định hơn.

| Hạng mục | Dịch vụ/Gói | Chi phí USD/tháng | Quy đổi VND/tháng |
|---|---|---:|---:|
| Chạy backend | Render Standard | $25 | 650.000 VND |
| Cơ sở dữ liệu | Neon paid/always-on nhỏ | $25 | 650.000 VND |
| Lưu trữ ảnh/video | Cloudflare R2 100-500GB | $8 | 208.000 VND |
| DNS/CDN | Cloudflare Free | $0 | 0 VND |
| Dự phòng vận hành | Tỷ giá, database usage, media và logs | $12 | 312.000 VND |
| **Tổng phí hạ tầng** |  | **$70** | **1.820.000 VND** |

Phù hợp khi:

- Hệ thống chạy chính thức.
- Người dùng và admin sử dụng thường xuyên.
- Có nhiều bài viết, hình ảnh, video, địa điểm và dữ liệu shop.

## 5. Khuyến nghị triển khai ban đầu

Khuyến nghị bắt đầu bằng Giai đoạn 1:

```text
Render Starter + Neon Free + Cloudflare R2 Free
Tổng phí hạ tầng: $10/tháng ~ 260.000 VND/tháng
```

Đây là mức chi phí thấp nhưng vẫn phù hợp để triển khai thật, vì backend không bị sleep như các gói miễn phí hoàn toàn. Khi lượng người dùng và dữ liệu tăng lên, hệ thống có thể nâng cấp dần sang Giai đoạn 2 hoặc Giai đoạn 3 mà không cần thay đổi toàn bộ kiến trúc.

## 6. Ghi chú

Chi phí trong báo cáo đã bao gồm một phần dự phòng vận hành để hạn chế biến động nhỏ do tỷ giá, usage database, dung lượng media hoặc request tăng nhẹ.

Chi phí thực tế có thể thay đổi nếu:

- Tỷ giá USD/VND thay đổi mạnh.
- Số lượng người dùng tăng nhanh hơn dự kiến.
- Dung lượng ảnh/video vượt xa phạm vi từng giai đoạn.
- Phát sinh thêm dịch vụ monitoring, backup, email, SMS, domain hoặc các dịch vụ bên thứ ba khác.

## 7. Nguồn tham khảo giá

- Render Pricing: https://render.com/pricing
- Render Deploys: https://render.com/docs/deploys
- Neon Pricing: https://neon.com/pricing
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
