# Money Manager Backend (Phase 2)

Backend API cho mobile/web dùng chung, theo kiến trúc `Hono + Supabase (PostgreSQL + Auth)`.

## 1. Cài đặt

```bash
cd backend
npm install
cp .env.example .env
```

Điền biến môi trường trong `.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_PORT` (mặc định `8787`)
- `CRON_SECRET` (bắt buộc khi bật lịch nhắc hóa đơn tự động)
- `ZALO_SHARED_OWNER_ID`, `ZALO_PAYMENT_REMINDER_TEMPLATE_ID` và
  `ZALO_REMINDERS_ENABLED=true` để bật OA TrọCare dùng chung. Admin chỉ kết nối
  OA một lần dưới user `ZALO_SHARED_OWNER_ID`; chủ trọ không phải tự OAuth Zalo.
- `UPSTASH_REDIS_REST_URL` (không bắt buộc; bật distributed API cache)
- `UPSTASH_REDIS_REST_TOKEN` (không bắt buộc; chỉ lưu ở backend/Render)

## 2. Khởi tạo DB Supabase

Mở SQL Editor của Supabase và chạy file:

- `supabase/schema.sql`

File này tạo:

- Bảng domain chính: wallets, transactions, rooms, contracts, invoices, trading...
- Quan hệ FK theo mô hình hiện tại của mobile
- Cột `user_id` cho multi-tenant
- RLS policies theo `auth.uid() = user_id`

## 3. Chạy backend

```bash
npm run dev
```

Nếu môi trường bị chặn process `watch` (lỗi `spawn EPERM`), dùng:

```bash
npm run dev:compiled
```

Health check:

```bash
GET http://localhost:8787/health
```

## 4. API chính

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me` (Bearer token)
- `GET/POST/PATCH /wallets`
- `GET/POST/PATCH/DELETE /categories`
- `GET/POST/PATCH/DELETE /transactions`
- `GET/POST/PATCH/DELETE /rental/rooms`
- `GET/POST/PATCH /rental/tenants`
- `GET/POST/PATCH/DELETE /rental/services`
- `GET /rental/contracts/active`
- `POST /rental/contracts`
- `PATCH /rental/contracts/:id`
- `POST /rental/contracts/:id/terminate`
- `GET /rental/contracts/:id/services`
- `GET/POST /invoices`
- `GET /invoices/:id`
- `GET /invoices/history/:contractId`
- `GET /invoices/previous-debt`
- `GET /invoices/latest-meter-readings`
- `POST /invoices/:id/mark-paid`
- `DELETE /invoices/:id`
- `GET/POST/PATCH/DELETE /trading/items`
- `GET /trading/items/batch/:batchId`
- `GET /trading/stats`
- `GET/PUT /bank-config`

## 5. Ghi chú triển khai

- Backend xác thực JWT bằng Supabase Auth (`Authorization: Bearer <access_token>`).
- Query DB dùng service role key, luôn filter theo `user_id` để tách dữ liệu user.
- Đây là foundation của Phase 2, có thể mở rộng thêm analytics/rules ở Phase 3.
- Cache API dùng L1 memory trên từng instance và tự nâng lên L2 Upstash Redis khi
  có đủ hai biến `UPSTASH_REDIS_*`. Redis lỗi hoặc timeout không làm API lỗi.
- Nhắc hóa đơn tự động dùng endpoint nội bộ `POST /internal/jobs/payment-reminders`.
  Scheduler gọi một lần mỗi ngày (khuyến nghị 08:00, múi giờ Asia/Ho_Chi_Minh) với
  header `Authorization: Bearer <CRON_SECRET>`. Job có khóa idempotency nên chạy lại
  không gửi trùng cùng một mốc nhắc.
- Mỗi mốc nhắc luôn ưu tiên lưu in-app và gửi push. Zalo là kênh bổ sung: lỗi
  Zalo không làm job thất bại, được ghi log và thử lại sau 15 phút, 1 giờ và 6 giờ.
- Sau khi deploy migration mới, chạy Query Performance/Index Advisor trong
  Supabase để xác nhận index dashboard được sử dụng trên dữ liệu production.
