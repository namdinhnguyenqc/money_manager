# Tài liệu TrọCare

## Hệ thống gồm những gì

| Thư mục | Là gì | Chạy ở đâu |
|---|---|---|
| `backend/` | API Hono (Node) | Vercel, project `trocare-api` → https://trocare-api.vercel.app |
| `web-admin/` | Web cho **chủ trọ** (tên thư mục gây nhầm, không phải trang admin) | Vercel, project `trocare-production` → https://trocare-production.vercel.app |
| `admin-portal/` | Cổng **admin** nội bộ | Vercel, project `tcare.production` → https://tcareproduction.vercel.app |
| `mobile/` | App Android/iOS cho chủ trọ (Expo) | Build APK bằng Gradle |
| `tenant-mobile/` | App cho người thuê (Expo) | Build APK bằng Gradle |

Database: một project Supabase (PostgreSQL) dùng chung cho production. Chưa có môi trường staging.

## Đọc gì

| Việc | Trang |
|---|---|
| Kiến trúc, route backend, xác thực | [architecture.md](architecture.md) |
| Cài đặt, chạy local, build APK, deploy, test, dọn dung lượng | [getting-started.md](getting-started.md) |
| Migration database | [database.md](database.md) |
| Danh sách endpoint (sinh tự động từ code) | [endpoints.md](endpoints.md) |
| Hợp đồng, cọc, trả phòng | [features/contract-management.md](features/contract-management.md) |
| Hóa đơn, thu tiền, SePay, Zalo | [features/billing-payments.md](features/billing-payments.md) |
| Dãy trọ, phòng | [features/facility-room-management.md](features/facility-room-management.md) |
| Ví, sổ quỹ | [features/finance-transactions.md](features/finance-transactions.md) |
| Đăng nhập, hồ sơ, duyệt chủ trọ | [features/owner-onboarding.md](features/owner-onboarding.md) |
| Kinh doanh hàng hóa | [features/trading-inventory.md](features/trading-inventory.md) |
| Cổng admin | [features/admin-management.md](features/admin-management.md) |
| Tin tức, SEO | [features/news-cms.md](features/news-cms.md) |

Các trang trong `features/` được viết từ tháng 5/2026 và chưa được rà lại toàn bộ; khi lệch với code thì code đúng. Riêng mục "Trả phòng" trong `contract-management.md` là mô tả hiện hành.

## Quy tắc nghiệp vụ

- **Cách ly dữ liệu:** backend dùng service role (bỏ qua RLS), nên mọi truy vấn phải lọc theo `user_id` / `owner_id` của chủ trọ.
- **ID** là UUID dạng chuỗi; không ép sang số.
- **Khách thuê:** số điện thoại đúng 10 số; CCCD 12 số (không bắt buộc).
- **Phòng:** tạo hợp đồng thì phòng thành `occupied`; trả phòng thì về `vacant`.
- **Hóa đơn:** mỗi phòng và hợp đồng chỉ có một hóa đơn cho mỗi tháng. Ngày chốt tiền từ 1 đến 28.
- **Tháng đầu không trọn tháng:** tiền phòng và các dịch vụ không theo công tơ được tính theo số ngày ở (chủ trọ có thể chọn "Cả tháng" hoặc bỏ tick từng khoản trên form). Điện, nước theo công tơ tính theo số dùng.
- **Thu tiền** chạy trong hàm SQL `apply_invoice_payment_atomic`; **trả phòng** chạy trong `terminate_contract_atomic`. Không ghi sổ quỹ và trạng thái hóa đơn bằng nhiều lệnh rời rạc.
- **Hồ sơ chưa hoàn tất** thì API trả `403 PROFILE_REQUIRED` cho mọi route của chủ trọ.

## Ba điều dễ làm hỏng

1. **Không thêm `vercel.json` ở thư mục gốc.** Nó ghi đè cấu hình của project Vercel có Root Directory là `.` và từng làm cổng admin phục vụ nhầm web chủ trọ.
2. **Migration không tự chạy.** File trong `backend/supabase/migrations/` phải chạy tay trong Supabase SQL Editor trước khi deploy code dùng nó.
3. **Biên dịch được chưa có nghĩa là chạy được.** Sau mỗi lần deploy chạy `node tools/smoke-test.mjs`.
