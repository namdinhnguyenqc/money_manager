# Tài liệu TrọCare

Điểm bắt đầu cho người (và AI agent) sửa code. Mở đúng file theo việc cần làm, không cần đọc hết.

## Hệ thống gồm những gì

| Thư mục | Là gì | Chạy ở đâu |
|---|---|---|
| `backend/` | API Hono (Node) | Vercel, project `trocare-api` → https://trocare-api.vercel.app |
| `web-admin/` | Web cho **chủ trọ** (tên thư mục gây nhầm, không phải trang admin) | Vercel, project `trocare-production` → https://trocare-production.vercel.app |
| `admin-portal/` | Cổng **admin** nội bộ | Vercel, project `tcare.production` → https://tcareproduction.vercel.app |
| `mobile/` | App Android/iOS cho chủ trọ (Expo) | Build APK bằng Gradle hoặc EAS |
| `tenant-mobile/` | App cho người thuê (Expo) | Build APK bằng Gradle hoặc EAS |

Database: một project Supabase (PostgreSQL) dùng chung cho production. **Chưa có môi trường staging**, nên backend chạy trên máy cũng ghi vào database thật.

## Tra theo việc cần làm

| Việc | Đọc |
|---|---|
| Hiểu kiến trúc, route backend, xác thực | [01-architecture/architecture-runtime.md](01-architecture/architecture-runtime.md) |
| Cài đặt, chạy local, build APK, deploy | [09-dev-guidelines/getting-started.md](09-dev-guidelines/getting-started.md) |
| Viết và chạy test | [09-dev-guidelines/testing-guidelines.md](09-dev-guidelines/testing-guidelines.md) |
| Quy tắc nghiệp vụ bắt buộc | [02-business-rules/core-invariants.md](02-business-rules/core-invariants.md) |
| Đăng nhập, hồ sơ, duyệt chủ trọ | [03-features/owner-onboarding.md](03-features/owner-onboarding.md) |
| Dãy trọ, phòng | [03-features/facility-room-management.md](03-features/facility-room-management.md) |
| Hợp đồng, cọc, **trả phòng** | [03-features/contract-management.md](03-features/contract-management.md) |
| Hóa đơn, thu tiền, SePay, Zalo | [03-features/billing-payments.md](03-features/billing-payments.md) |
| Ví, sổ quỹ thu chi | [03-features/finance-transactions.md](03-features/finance-transactions.md) |
| Kinh doanh hàng hóa | [03-features/trading-inventory.md](03-features/trading-inventory.md) |
| Cổng admin | [03-features/admin-management.md](03-features/admin-management.md) |
| Tin tức, SEO | [03-features/news-cms.md](03-features/news-cms.md) |
| Chuẩn lỗi API, danh sách endpoint | [04-api-contract/](04-api-contract/) |
| Bảng, RLS, migration | [05-database/database-schema.md](05-database/database-schema.md), [05-database/migrations-runbook.md](05-database/migrations-runbook.md) |
| Quy ước code | [06-engineering-rules/engineering-constitution.md](06-engineering-rules/engineering-constitution.md) |
| Màu, font, component UI | [07-ui-ux-system/design-tokens-ui.md](07-ui-ux-system/design-tokens-ui.md) |
| Mobile: token, push notification | [08-mobile/mobile-compatibility.md](08-mobile/mobile-compatibility.md) |
| Hướng dẫn cho AI agent | [10-ai-context/ai-agent-playbook.md](10-ai-context/ai-agent-playbook.md) |

Tài liệu cũ (kế hoạch theo phase, prompt, SQL đã chạy) nằm ở [archive/](archive/README.md) và không phản ánh hiện trạng.

## Ba điều dễ làm hỏng

1. **Không thêm `vercel.json` ở thư mục gốc.** Nó ghi đè cấu hình của mọi project Vercel có Root Directory là `.` và từng làm cổng admin phục vụ nhầm web chủ trọ.
2. **Migration không tự chạy.** File trong `backend/supabase/migrations/` phải được chạy tay trong Supabase SQL Editor (xem runbook). Code dùng bảng mới mà quên chạy migration sẽ lỗi trên production.
3. **Biên dịch được chưa có nghĩa là chạy được.** Sau mỗi lần deploy, chạy `node tools/smoke-test.mjs` để kiểm tra từng site phục vụ đúng app.
