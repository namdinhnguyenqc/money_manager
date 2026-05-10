# API Inventory Current

Tài liệu này mô tả các API hiện có trong codebase backend tại `money-manager-mobile/backend/src/routes` và đối chiếu nhanh với mục tiêu nền tảng phòng trọ.

## Smoke test local mới nhất

Ngày kiểm tra: 2026-04-29.

Môi trường: backend mock local `http://localhost:8787`.

Kết quả: **27/27 API chính pass** cho các luồng đang được FE dùng trong Phase 1:

- Auth owner/admin: pass.
- Public listing/rooms: pass.
- Owner facilities/rooms: pass.
- Tạo phòng trong cơ sở: pass.
- Rental rooms/tenants/contracts: pass.
- Validation tenant sai `{ phone: "1", idCard: "1" }`: **đã bị reject 400**.
- Invoice create/detail/collect payment: pass.
- Transactions/wallets/categories/bank/trading list: pass.
- Admin users/stats: pass.

Bug đã fix trong backend:

- `/rental/tenants` không còn nhận `phone` và `idCard` tùy tiện. `phone` phải đúng 10 số; `idCard`/CCCD phải đúng 12 số; `email` phải đúng format nếu gửi.
- `/rental/contracts/active` trong mock mode không còn treo do gọi Supabase.
- `/categories` trong mock mode không còn treo do gọi Supabase.
- Backend `tsc --noEmit` đã pass sau khi sửa lỗi type ở owner room create và mock room shape.

Giới hạn xác minh: kết quả trên là **mock/local runtime**. DB Supabase thật, RLS và migration production chưa được kiểm chứng trong lần smoke này.

## Auth

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `POST` | `/auth/login` | Demo login local bằng email/password | `money-manager`, owner login `web-admin` | Working |
| `POST` | `/auth/admin-login` | Login admin cứng | `web-admin` | Working |
| `POST` | `/auth/google` | Google auth | Chưa có flow FE hoàn chỉnh | Implemented |
| `POST` | `/auth/refresh` | Refresh token | FE auth client | Working |
| `POST` | `/auth/logout` | Logout | `money-manager`, `web-admin` | Working |
| `GET` | `/auth/me` | Lấy user hiện tại | `money-manager`, `web-admin` | Working |

## Admin

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/admin/users` | List users | `web-admin/admin/users` | Working |
| `GET` | `/admin/users/:id` | User detail | `web-admin/admin/users/[id]` | Working |
| `PATCH` | `/admin/users/:id/status` | Đổi status user | `web-admin` | Working |
| `PATCH` | `/admin/users/:id/role` | Đổi role | `web-admin` | Working |
| `DELETE` | `/admin/users/:id` | Xóa user | `web-admin` | Working |
| `GET` | `/admin/stats` | Dashboard stats | Chưa dùng mạnh | Implemented |
| `GET` | `/admin/boarding-houses` | List boarding houses | Chưa có UI sâu | Implemented |
| `GET` | `/admin/boarding-houses/:id` | Boarding house detail | Chưa verify | Implemented |
| `POST` | `/admin/boarding-houses` | Tạo boarding house | Chưa verify | Implemented |
| `PATCH` | `/admin/boarding-houses/:id` | Sửa boarding house | Chưa verify | Implemented |
| `DELETE` | `/admin/boarding-houses/:id` | Xóa boarding house | Chưa verify | Implemented |
| `GET` | `/admin/rooms` | List rooms | Chưa có UI sâu | Implemented |
| `GET` | `/admin/rooms/:id` | Room detail | Chưa verify | Implemented |
| `POST` | `/admin/rooms` | Tạo room | Chưa verify | Implemented |
| `PATCH` | `/admin/rooms/:id` | Sửa room | Chưa verify | Implemented |
| `DELETE` | `/admin/rooms/:id` | Xóa room | Chưa verify | Implemented |

## Owner

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/owner/boarding-houses` | List boarding houses | `web-admin/owner` | Working |
| `GET` | `/owner/boarding-houses/:id` | Boarding house detail | `web-admin/owner` | Working |
| `POST` | `/owner/boarding-houses` | Tạo boarding house | `web-admin/owner` | Working |
| `PATCH` | `/owner/boarding-houses/:id` | Sửa boarding house | `web-admin/owner` | Working |
| `DELETE` | `/owner/boarding-houses/:id` | Xóa boarding house | Chưa có UI rõ | Implemented |
| `GET` | `/owner/boarding-houses/:id/rooms` | List rooms theo BH | `web-admin/owner` | Working |
| `POST` | `/owner/boarding-houses/:id/rooms` | Tạo room | `web-admin/owner` | Working |
| `PATCH` | `/owner/rooms/:id` | Sửa room | `web-admin/owner` | Working |
| `DELETE` | `/owner/rooms/:id` | Xóa room | Chưa có UI rõ | Implemented |
| `GET` | `/owner/leads` | List leads | `web-admin/owner` | Working |
| `GET` | `/owner/bookings` | List booking/hold requests | `web-admin/owner/bookings` | Working in mock mode |
| `POST` | `/owner/bookings/:id/confirm` | Owner xác nhận booking | `web-admin/owner/bookings` | Working in mock mode |
| `POST` | `/owner/bookings/:id/reject` | Owner từ chối booking | `web-admin/owner/bookings` | Working in mock mode |
| `GET` | `/owner/notifications` | List notification owner | `web-admin/owner/notifications` | Working in mock mode |
| `GET` | `/owner/audit-logs` | List audit log owner | `web-admin/owner/audit-logs` | Working in mock mode |
| `GET` | `/owner/conversations` | List hội thoại lead/booking | `web-admin/owner/messages` | Working in mock mode |
| `GET` | `/owner/conversations/:id/messages` | Xem tin nhắn theo hội thoại | `web-admin/owner/messages` | Working in mock mode |
| `POST` | `/owner/conversations/:id/messages` | Owner trả lời khách | `web-admin/owner/messages` | Working in mock mode |

## Public Guest

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/public/boarding-houses` | List dãy trọ public | `web-admin/public/boarding-houses` | Working in mock mode |
| `GET` | `/public/boarding-houses/:id` | Detail dãy trọ public | `web-admin/public/boarding-houses/[id]` | Working in mock mode |
| `GET` | `/public/rooms?bhId=:id` | List phòng public theo dãy | `web-admin/public/boarding-houses/[id]` | Working in mock mode |
| `POST` | `/public/leads` | Guest gửi lead cho chủ trọ | `LeadForm` trên public detail | Working in mock mode |
| `POST` | `/public/bookings` | Guest gửi yêu cầu giữ chỗ | Public detail hold form | Working in mock mode |

## Wallet / Transaction / Category

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/wallets` | List wallets | `money-manager` | Working |
| `POST` | `/wallets` | Tạo wallet | `SettingsPage` | Working |
| `PATCH` | `/wallets/:id` | Sửa wallet | Chưa có UI edit mạnh | Implemented |
| `GET` | `/wallets/:id/stats` | Wallet stats | Chưa dùng sâu | Implemented |
| `GET` | `/transactions` | List transactions | Dashboard, Transactions | Working |
| `POST` | `/transactions` | Tạo transaction | Transaction modal | Working |
| `PATCH` | `/transactions/:id` | Sửa transaction | Chưa có UI | Implemented |
| `DELETE` | `/transactions/:id` | Xóa transaction | Transactions page | Working |
| `GET` | `/categories` | List categories | Chưa nối UI | Implemented |
| `POST` | `/categories` | Tạo category | Chưa nối UI | Implemented |
| `PATCH` | `/categories/:id` | Sửa category | Chưa nối UI | Implemented |
| `DELETE` | `/categories/:id` | Xóa category | Chưa nối UI | Implemented |

## Rental / Invoice / Bank

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/rental/rooms` | List room nội bộ | Rental page | Working |
| `POST` | `/rental/rooms` | Tạo room nội bộ | Chưa có UI | Implemented |
| `PATCH` | `/rental/rooms/:id` | Sửa room | Chưa có UI rõ | Implemented |
| `DELETE` | `/rental/rooms/:id` | Xóa room | Chưa có UI | Implemented |
| `GET` | `/rental/tenants` | List tenant | Chưa có page riêng | Implemented |
| `POST` | `/rental/tenants` | Tạo tenant | Contract modal | Working |
| `PATCH` | `/rental/tenants/:id` | Sửa tenant | Chưa có UI | Implemented |
| `GET` | `/rental/services` | List services | Billing/contract modal | Working |
| `POST` | `/rental/services` | Tạo service | Chưa có UI | Implemented |
| `PATCH` | `/rental/services/:id` | Sửa service | Chưa có UI | Implemented |
| `DELETE` | `/rental/services/:id` | Xóa service | Chưa có UI | Implemented |
| `GET` | `/rental/contracts/active` | List active contracts | Chưa có page riêng | Implemented |
| `POST` | `/rental/contracts` | Tạo contract | Contract modal | Working |
| `PATCH` | `/rental/contracts/:id` | Sửa contract | Chưa có UI | Implemented |
| `POST` | `/rental/contracts/:id/terminate` | Thanh lý contract | Terminate modal | Working |
| `GET` | `/rental/contracts/:id/services` | Service của contract | Billing modal | Working |
| `GET` | `/invoices` | List invoices | Chưa có page riêng | Implemented |
| `POST` | `/invoices` | Tạo invoice | Billing modal | Working |
| `GET` | `/invoices/history/:contractId` | Lịch sử invoice | Chưa có page riêng | Implemented |
| `GET` | `/invoices/previous-debt` | Nợ cũ | Billing modal | Working |
| `GET` | `/invoices/latest-meter-readings` | Số công tơ gần nhất | Billing modal | Working |
| `GET` | `/invoices/:id` | Invoice detail | Chưa có UI | Implemented |
| `POST` | `/invoices/:id/mark-paid` | Mark paid | Chưa có UI | Implemented |
| `DELETE` | `/invoices/:id` | Xóa invoice | Chưa có UI | Implemented |
| `GET` | `/bank-config` | Lấy bank config | Settings/Billing | Working |
| `PUT` | `/bank-config` | Lưu bank config | Settings | Working |

## Trading

| Method | Endpoint | Mục đích | FE đang dùng | Trạng thái |
|---|---|---|---|---|
| `GET` | `/trading/items` | List items | Trading page | Working |
| `GET` | `/trading/items/batch/:batchId` | Batch detail | Chưa dùng UI | Implemented |
| `POST` | `/trading/items` | Tạo item/lô hàng | AddTradingItemModal | Working |
| `PATCH` | `/trading/items/:id` | Cập nhật/sell item | Sell modal | Working |
| `DELETE` | `/trading/items/:id` | Xóa item | Chưa có UI rõ | Implemented |
| `GET` | `/trading/stats` | Trading stats | Trading page | Working |

## Gap so với nền tảng phòng trọ

### Đã có một phần

- Auth cơ bản
- Admin/owner CRUD boarding house và room
- Public guest listing/detail/lead submission ở mức mock/existing boarding-house API
- Public hold booking request + owner confirm/reject ở mức mock runtime
- Notification/audit read endpoints ở mức mock runtime
- Conversation/message owner inbox ở mức mock runtime
- Leads list nội bộ
- Rental contracts/invoices nội bộ

### Chưa có

- Public room search/faceted search chuẩn marketplace
- Public room detail SEO/SSR đầy đủ theo domain `rental_*`
- Facets và map search
- OTP auth
- Booking engine `hold-first` production-grade transaction/locking
- Conversation/messages production-grade tenant-owner, có auth tenant và realtime
- Notification center
- SSE/WebSocket realtime
- Audit logs
- Moderation APIs
- Privacy/export/delete APIs
- Service/API mapping sang `rental_*` schema mới
- Runtime idempotency enforcement
- Runtime outbox processing
- RLS/PostGIS/search indexes đã có migration nền, nhưng chưa apply/verify trên DB thật
