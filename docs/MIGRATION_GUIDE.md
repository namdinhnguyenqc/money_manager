# Hướng Dẫn Chạy Migration & Quản Lý Schema (TrọCare)

Tài liệu này hướng dẫn cách chạy và quản lý database migration cho dự án TrọCare, đảm bảo tính nhất quán giữa môi trường Local, Staging và Production.

---

## 📌 1. Nguồn Migration Chuẩn (Canonical Source of Truth)

Thư mục chính thức chứa các file migrations:
👉 **`backend/src/migrations/`**

Tất cả các file sql trong thư mục này được đặt tên theo định dạng chuẩn:
`XXX_description.sql` (Ví dụ: `016_full_uuid_reset.sql`, `021_room_contract_fields.sql`).

---

## ⚙️ 2. Danh Sách Các File Migrations Hiện Tại (Sau Audit)

Dưới đây là các migration đã được chuẩn hoá đặt tên và dọn dẹp (giải quyết xung đột trùng số `017` và loại bỏ `CONCURRENTLY` để chạy an toàn trong transaction):

- `016_full_uuid_reset.sql`: Khởi tạo lại toàn bộ DB sử dụng UUID (bảng users, rooms, contracts, refresh_tokens, v.v.)
- `017_deposit_refunds.sql`: Thêm bảng hoàn tiền đặt cọc (`deposit_refunds`)
- `018_fix_users_columns.sql`: Bổ sung các cột thông tin profile cho bảng `users`
- `019_align_trading_items_mobile_contract.sql`: Đồng bộ dữ liệu trading/mobile
- `020_add_room_types.sql`: Thêm loại phòng (`room_types`)
- `021_room_contract_fields.sql`: Thêm các cột diện tích, số người tối đa, giá thuê mặc định...
- `022_indexes.sql`: Tạo index tối ưu hiệu năng cho các truy vấn lọc/sắp xếp thường gặp (đã chuyển từ `CONCURRENTLY` sang index thường để an toàn khi chạy migration tự động).

---

## 🚀 3. Hướng Dẫn Chạy Migration

### A. Môi trường Local (Phát triển)
1. Sử dụng Supabase CLI hoặc chạy trực tiếp các file SQL bằng trình biên soạn SQL trên Dashboard của Supabase Local.
2. Ngoài ra, bạn có thể sử dụng script runner trong `backend/src/run_migration_017.ts` bằng cách copy code và chạy qua `tsx`:
   ```bash
   cd backend
   npx tsx src/run_migration_017.ts
   ```

### B. Môi trường Production (Supabase Cloud)
1. **Bước 1:** Truy cập vào trang Dashboard của Supabase dự án Production.
2. **Bước 2:** Vào mục **SQL Editor**.
3. **Bước 3:** Tạo một **New Query**.
4. **Bước 4:** Copy toàn bộ nội dung file SQL cần chạy (ví dụ `022_indexes.sql`) và nhấn **Run**.
5. **Bước 5:** Xác nhận kết quả thành công và kiểm tra các index/bảng mới tạo trong **Database Schema**.

---

## ⚠️ 4. Các Quy Tắc Quan Trọng (Best Practices)

1. **Không dùng `COMMIT;` hoặc `ROLLBACK;` trong file migration:** Runner của Supabase hoặc PostgreSQL client thường tự động wrap toàn bộ file SQL vào một transaction duy nhất. Việc viết `COMMIT` thủ công sẽ gây lỗi hoặc mất an toàn dữ liệu.
2. **Không dùng `CONCURRENTLY` khi tạo Index trong transaction block:** PostgreSQL không cho phép chạy `CREATE INDEX CONCURRENTLY` trong transaction. Do đó, tất cả index trong file migrations phải dùng `CREATE INDEX` tiêu chuẩn.
3. **Tuyệt đối không đổi tên/sửa nội dung các file từ `001` đến `016`:** Đây là baseline DB, thay đổi sẽ làm sai lệch cấu trúc hiện tại của dự án. Chỉ viết file mới tăng dần (từ `023` trở đi).
