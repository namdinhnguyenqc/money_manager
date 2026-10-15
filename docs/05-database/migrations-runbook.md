# Migration database

## Thư mục

- **`backend/supabase/migrations/`**: nơi đặt migration mới. Đặt tên theo ngày, ví dụ `20260821_billing_upgrades.sql`.
- `backend/src/migrations/` (001–033): migration đời đầu, đã chạy hết. Không sửa, không thêm file mới vào đây. Một số số thứ tự bị trùng (hai file 028, ba file 029); giữ nguyên vì đã chạy.

## Cách chạy

Chưa có công cụ chạy migration tự động và chưa có bảng ghi lại migration nào đã chạy.

1. Mở Supabase Dashboard → SQL Editor của project production.
2. Dán nội dung file migration, chạy.
3. Cuối file nên có `NOTIFY pgrst, 'reload schema';` để API Supabase nhận bảng/cột mới ngay.
4. Deploy code dùng bảng/cột mới **sau** khi migration đã chạy.

## Quy tắc viết

- Chỉ thêm, không phá: `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`. Code mới phải chạy được cả khi migration chưa kịp áp dụng, hoặc báo lỗi rõ ràng.
- Hàm `SECURITY DEFINER` phải `SET search_path`, kiểm tra `p_user_id` khớp người gọi, và `REVOKE ... FROM PUBLIC` trước khi `GRANT`.
- Không sửa một migration đã chạy; viết migration mới.

## Bài học

Bảng `zca_sessions` từng có migration nhưng chưa được chạy trên production, khiến kết nối Zalo bằng QR không bao giờ lưu được phiên. Khi một tính năng mới "không lưu được", việc đầu tiên là kiểm tra migration của nó đã chạy chưa.
