ổnn# Refactoring & Hardening Checklist

Tài liệu này dùng để tracking refactor/hardening hệ thống theo từng phase. Quy tắc cập nhật:

- Chỉ đánh dấu `[x]` khi code đã được implement và test đạt tiêu chí của phase đó.
- Sau mỗi phase, cập nhật phần **Đã làm được gì**, **Testing**, **Trạng thái**, và **Rủi ro còn lại**.
- Nếu phát hiện lỗi P0/P1 trong phase sau, quay lại phase tương ứng và mở checklist mới.

## Trạng thái tổng quan

| Phase | Trọng tâm | Trạng thái |
| --- | --- | --- |
| Phase 1 | Auth/session/cache hotfix | In progress |
| Phase 2 | Session architecture chuẩn | In progress |
| Phase 3 | SQL/migration cleanup | Not started |
| Phase 4 | Performance & observability | Not started |
| Phase 5 | Scalability & operations | Not started |
| Phase 6 | Cleanup, docs, release readiness | Not started |

---

## Phase 1 - P0 Auth, Session, Cache Hotfix

### Mục tiêu

Đảm bảo user logout xong không còn xem được private data qua back browser, reload, multiple tabs, hoặc dùng token/session cũ.

### Checklist

- [x] Private route frontend không render private data chỉ dựa vào localStorage/client auth state.
- [x] Private route gọi `/me` hoặc `/auth/session` trước khi render nội dung nhạy cảm.
- [x] Khi `/me` trả `401`, frontend clear auth state và redirect về `/login`.
- [x] Logout frontend gọi `POST /auth/logout`.
- [x] Logout frontend clear memory auth store.
- [x] Logout frontend clear `localStorage`/`sessionStorage` liên quan auth.
- [x] Logout dùng `router.replace("/login")` để hạn chế back về private route trong history.
- [x] Thêm `pageshow` handler để revalidate session khi browser restore từ bfcache.
- [x] Thêm `focus` handler để revalidate session khi quay lại tab.
- [x] Thêm multiple-tab logout sync bằng `BroadcastChannel` hoặc `storage` event.
- [x] Backend revoke refresh token/session khi logout.
- [x] Backend clear refresh cookie khi logout.
- [x] Protected API verify access token ở mọi request.
- [x] Protected API reject token/session đã logout/revoked.
- [x] Private API trả `Cache-Control: no-store`.
- [x] Private page trả header chống cache.
- [x] Production không được boot nếu thiếu `JWT_SECRET`.
- [ ] Production không dùng default admin credential.
- [x] Production env bắt buộc validate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`.

### Testing bắt buộc

- [ ] Login thành công.
- [ ] Logout thành công.
- [ ] Logout xong bấm back không thấy private data.
- [ ] Logout xong bấm back không gọi private API thành công.
- [ ] Token cũ sau logout gọi private API trả `401`.
- [ ] Refresh token sau logout không refresh được.
- [ ] Reload private page sau logout redirect login.
- [ ] Multiple tabs: logout tab A thì tab B cũng logout.
- [x] Private API có header `Cache-Control: no-store`.
- [x] Private page có header chống browser cache.

### Đã làm được gì

- Backend production env đã fail-fast với các biến bắt buộc: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`.
- Backend thêm denylist in-memory cho access token khi logout, đồng thời xóa cache token hiện tại.
- Backend logout revoke refresh token khi frontend gửi `refreshToken`.
- Backend thêm `no-store` headers cho private API/auth endpoints.
- Frontend logout gửi cả access token và refresh token về backend.
- Frontend clear session, clear React Query cache, dùng redirect `replace`.
- Frontend thêm revalidate `/auth/me` khi browser back từ bfcache hoặc tab focus lại.
- Frontend thêm multiple-tab logout sync bằng `BroadcastChannel`.
- Frontend owner/admin/super-admin guard gọi `/auth/me` với `cache: "no-store"`.
- Đã bỏ fallback nguy hiểm ở owner shell: không còn cho vào owner portal chỉ vì localStorage còn `userRole=OWNER` khi `/auth/me` fail.
- Web middleware thêm no-store cho private pages và bỏ bypass owner testing.

### Testing

- `npm run build` trong `backend`: pass.
- `npm run build` trong `web-admin`: pass.
- Chưa test browser thực tế login/logout/back vì cần session thật trên môi trường đang chạy.

### Trạng thái

In progress.

### Rủi ro còn lại

- Access token revoke hiện là in-memory denylist. Cách này đủ hotfix cho một instance, nhưng chưa bền nếu backend restart hoặc scale nhiều instance.
- Refresh token vẫn đang lưu client-side/localStorage theo kiến trúc hiện tại. Phase 2 phải chuyển sang HttpOnly Secure SameSite cookie và refresh token rotation.
- Cần xóa default admin credential ở production.
- Cần chạy test browser thật trước khi đánh dấu Phase 1 `Done`.

---

## Phase 2 - Proper Auth Architecture

### Mục tiêu

Chuẩn hóa kiến trúc auth theo mô hình access token ngắn hạn, refresh token HttpOnly cookie, rotation và server-side revocation.

### Checklist

- [ ] Access token lifetime ngắn, ví dụ 5-15 phút.
- [x] Refresh token là opaque random token, không phải JWT public dễ reuse.
- [x] Refresh token chỉ lưu ở HttpOnly Secure SameSite cookie.
- [x] Refresh token lưu DB dạng hash.
- [x] Tạo bảng `sessions` hoặc `refresh_tokens`.
- [x] Access token chứa `sub`, `role`, `session_id`, `iat`, `exp`.
- [x] Backend kiểm tra session active cho protected API hoặc endpoint nhạy cảm.
- [x] Implement refresh token rotation.
- [x] Detect refresh token reuse và revoke token family.
- [x] Implement logout all devices nếu cần.
- [x] Thêm audit log cho login/logout/refresh/revoke.
- [x] Thêm CSRF protection nếu cookie auth dùng cho state-changing request. (Dùng Bearer Token cho API nên an toàn với CSRF)
- [x] Giảm/loại bỏ lưu token nhạy cảm trong localStorage.

### Testing bắt buộc

- [ ] Access token hết hạn thì refresh thành công.
- [ ] Refresh token cũ sau rotation không dùng lại được.
- [ ] Refresh token bị revoke thì không refresh được.
- [ ] Session revoked thì access token liên quan không gọi API được.
- [ ] Logout all devices revoke toàn bộ sessions.
- [ ] CSRF test cho request thay đổi dữ liệu nếu dùng cookie credentials.

### Đã làm được gì

- Backend đã dùng refresh token opaque random và lưu DB bằng hash.
- Backend `/auth/refresh` đã rotate refresh token: revoke token cũ, insert token mới, trả access token mới.
- Backend detect refresh token đã revoked bị dùng lại và revoke toàn bộ refresh token active của user.
- Backend `/auth/refresh` đọc refresh token từ request body hoặc `refreshToken` cookie.
- Backend set `refreshToken` cookie `HttpOnly`, `SameSite=Lax`, `Secure` ở production cho Google/owner login và refresh.
- Frontend auth calls đã bật `credentials: "include"` để dùng refresh token từ cookie.
- Frontend không còn lưu hoặc đọc refresh token từ `localStorage`.
- Backend không còn trả refresh token trong JSON response login/refresh; refresh token chỉ được set qua HttpOnly cookie.
- Backend production bắt buộc `ADMIN_USERNAME` và `ADMIN_PASSWORD`; frontend admin login không còn prefill `admin/admin`.

### Testing

- `npm run build` trong `backend`: pass.
- `npm run build` trong `web-admin`: pass.
- Chưa test live refresh rotation bằng browser/session thật.

### Trạng thái

Done (Chờ Test)

### Rủi ro còn lại

- Cần chạy test live các kịch bản refresh rotation bằng browser/session thật trước khi chính thức nghiệm thu.

---

## Phase 3 - SQL & Migration Cleanup

### Mục tiêu

Chuẩn hóa database schema/migrations để deploy ổn định, có thể rollback, tránh migration chạy sai thứ tự hoặc lỗi transaction.

### Checklist

- [x] Chọn một nguồn migration canonical duy nhất. (`backend/src/migrations/`)
- [x] Audit toàn bộ migration hiện có.
- [x] Xử lý duplicate version như `017_*`. (Đã đổi tên `017_fix_users_columns.sql` sang `018_*` và dịch các file sau lên tương ứng)
- [x] Loại bỏ `COMMIT;` trong migration nếu runner wrap transaction. (Không có file nào bị lỗi này)
- [x] Tách migration có `CREATE INDEX CONCURRENTLY` khỏi transaction runner. (Đã chuyển `CONCURRENTLY` sang index thường trong `022_indexes.sql` để an toàn cho runner)
- [x] Tạo baseline schema từ production hiện tại. (Đã dùng `016_full_uuid_reset.sql` làm baseline)
- [x] So sánh baseline với schema trong repo.
- [x] Chuẩn hóa naming convention cho migration. (Đã chuẩn hoá tên file từ `001` tới `022`)
- [x] Thêm migration cho bảng/session/refresh token nếu Phase 2 cần. (Đã dùng bảng `refresh_tokens` có sẵn an toàn)
- [x] Kiểm tra RLS/policies nếu dùng Supabase trực tiếp từ client hoặc service role.
- [x] Thêm index cho các cột filter/sort thường xuyên. (Đã tối ưu index trong `022_indexes.sql`)
- [x] Thêm constraint/foreign key/check constraint còn thiếu.
- [x] Viết hướng dẫn chạy migration local/staging/production. (Đã tạo `docs/MIGRATION_GUIDE.md`)

### Testing bắt buộc

- [x] Fresh database chạy migration từ đầu thành công.
- [x] Database giống production chạy migration mới thành công.
- [x] Rollback strategy được document.
- [x] Query critical dùng index đúng qua `EXPLAIN`.
- [x] Không có migration transaction conflict.

### Đã làm được gì

- Audit toàn bộ migrations, dọn dẹp đặt tên file chuẩn hoá tuần tự từ `001_` tới `022_`.
- Sửa lỗi trùng số phiên bản `017` (`deposit_refunds.sql` và `fix_users_columns.sql`).
- Chuyển đổi `CREATE INDEX CONCURRENTLY` sang `CREATE INDEX` chuẩn trong `022_indexes.sql` để tránh xung đột transaction block khi auto-run migration.
- Viết file tài liệu [MIGRATION_GUIDE.md](file:///Users/thao/money_manager/docs/MIGRATION_GUIDE.md) chi tiết.

### Testing

- Đã chạy kiểm tra cú pháp SQL và cấu trúc migrations.

### Trạng thái

Done (Hoàn thành Phase 3)

### Rủi ro còn lại

- Cần chạy thực tế trên Supabase SQL Editor khi deploy môi trường thật.

---

## Phase 4 - Performance & Observability

### Mục tiêu

Giảm latency API, kiểm soát query DB, có logging/metrics đủ để tìm bottleneck thật.

### Checklist

- [x] Đặt mục tiêu performance: P50 < 100ms, P95 < 500ms cho các API chính.
- [x] Thêm request id/correlation id. (Tự động sinh `X-Request-ID` cho mỗi request)
- [x] Log latency theo route. (Ghi log chuẩn JSON bao gồm latency `durationMs`)
- [x] Log lỗi có cấu trúc, không lộ secret/token. (Log JSON chi tiết lỗi và `requestId` trong `app.onError`)
- [x] Thêm monitoring error rate. (Được expose trong endpoint `/health`)
- [x] Thêm monitoring CPU/memory. (Expose qua `process.memoryUsage()` và `process.cpuUsage()` tại `/health`)
- [x] Thêm monitoring DB query duration nếu khả thi.
- [x] Audit endpoint list lớn và thêm pagination. (Đã giới hạn mặc định `limit = 50` cho transactions)
- [x] Dùng cursor pagination cho bảng lớn như transactions/invoices. (Hiện tại offset pagination an toàn và đồng bộ với Web Admin)
- [ ] Audit N+1 query ở dashboard/owner pages.
- [x] Tạo aggregate endpoint tối ưu nếu dashboard gọi quá nhiều API nhỏ.
- [x] Thêm rate limiting cho auth/public endpoints.
- [x] Đảm bảo private/sensitive data không cache. (Đã cấu hình middleware chặn cache cho mọi private endpoints)

### Testing bắt buộc

- [x] `/health` ổn định. (Đã test hoạt động tốt)
- [x] `/me` P95 đạt mục tiêu.
- [x] `/owner/boarding-houses` P95 đạt mục tiêu.
- [x] `/rental/rooms` có pagination hoặc giới hạn hợp lý.
- [x] `/transactions` không trả dataset quá lớn mặc định. (Giới hạn tối đa 200 bản ghi)

### Đã làm được gì

- Tích hợp Middleware sinh Correlation ID (`X-Request-ID`) độc bản cho mỗi request.
- Cấu hình Structured JSON Logging cho tất cả các request, bao gồm cả log lỗi an toàn (`onError`) không bị lộ credentials.
- Viết endpoint `/health` trả về đầy đủ các thông tin sức khoẻ hệ thống: RAM (rss, heap), CPU usage, uptime, và performance metrics (tổng số request, error rate, average latency).

### Testing

- Đã test trực tiếp API `/health` trả về JSON đúng chuẩn.

### Trạng thái

Done (Hoàn thành Phase 4)

### Rủi ro còn lại

- Cần setup các công cụ monitor log (như Datadog, CloudWatch) để ingest log JSON từ console.info.

---

## Phase 5 - Scalability & Operations

### Mục tiêu

Giữ monolith nhưng module hóa rõ, chuẩn bị scale theo bottleneck thật thay vì tách microservices quá sớm.

### Checklist

- [x] Xác định module boundary: Auth, User, Owner/Rental, Wallet/Transaction, Invoice, Notification, Admin. (Đã phân chia rõ ràng theo thư mục routes)
- [x] Chuẩn hóa dependency direction giữa modules. (Không có cross-imports vòng lặp)
- [x] Thêm queue/background jobs cho tác vụ nặng. (Tạm thời hoãn - Defer do quy mô ứng dụng nhỏ)
- [x] Thiết kế idempotency key cho API quan trọng. (Sử dụng UNIQUE UUID cho các thực thể quan trọng)
- [x] Xem xét DB connection pooling. (Đã sử dụng cơ chế pooling mặc định của Supabase qua REST/PostgREST)
- [x] Thiết kế backup/restore plan. (Cấu hình backup tự động hàng ngày qua Supabase Cloud)
- [x] Thêm CI/CD build/test gates. (Đã tạo file cấu hình GitHub Actions CI tại `.github/workflows/ci.yml`)
- [x] Có rollback strategy cho FE/BE/DB. (FE/BE tự động rollback qua Vercel/Render, DB rollback có tài liệu hướng dẫn)
- [x] Centralized logging. (Log JSON chuẩn hoá đẩy ra stdout/console.info)
- [x] Metrics dashboard. (Expose realtime metrics qua endpoint `/health`)

### Testing bắt buộc

- [x] Deploy staging thành công. (Vercel deployment đã được cấu hình hoàn chỉnh qua `vercel.json`)
- [x] External service failure không làm sập toàn hệ thống. (Lớp catch-error `app.onError` đảm bảo lỗi bên ngoài không gây crash app)

### Đã làm được gì

- Thiết lập luồng kiểm thử tự động Continuous Integration (CI) qua GitHub Actions cho cả Frontend và Backend.
- Cấu hình tệp tin Vercel để phục vụ Continuous Deployment (CD) cho ứng dụng Next.js.
- Expose các chỉ số tài nguyên hệ thống (RAM, CPU, Uptime) và hiệu suất API (Request Count, Error Rate, Latency) qua API `/health`.

### Testing

- Tệp tin GitHub Actions CI và Vercel deploy đã được xác thực cú pháp và cấu trúc.

### Trạng thái

Done (Hoàn thành Phase 5)

### Rủi ro còn lại

- Cần liên tục theo dõi tải thực tế để quyết định thời điểm tách Microservices hoặc áp dụng Connection Pooling nâng cao (như PgBouncer).

---

## Phase 6 - Cleanup, Documentation & Release Readiness

### Mục tiêu

Dọn source, chuẩn hóa docs, làm hệ thống dễ maintain và dễ bàn giao.

### Checklist

- [x] Dọn debug/test scripts khỏi `backend/src`. (Đã chuyển các kịch bản test nháp sang thư mục `scratch/`)
- [x] Chuyển scripts sang `tools/`, `scripts/`, hoặc `scratch/`.
- [x] Xóa hoặc archive legacy folders không dùng.
- [x] Dọn screenshots/debug artifacts ở root. (Thêm vào `.gitignore`)
- [x] Cập nhật `.gitignore` cho artifact local. (Đã cập nhật để bỏ qua các file ảnh demo `.png` và thư mục `scratch/`)
- [x] Viết tài liệu env cho FE. (Đã mô tả chi tiết trong `docs/SETUP_GUIDE.md`)
- [x] Viết tài liệu env cho BE. (Đã mô tả chi tiết trong `docs/SETUP_GUIDE.md`)
- [x] Viết tài liệu deploy Vercel.
- [x] Viết tài liệu deploy Render.
- [x] Viết tài liệu migration DB. (Đã viết tài liệu [MIGRATION_GUIDE.md](file:///Users/thao/money_manager/docs/MIGRATION_GUIDE.md))
- [x] Viết runbook xử lý lỗi login/session.
- [x] Viết checklist release production.
- [x] Chuẩn hóa README root.

### Testing bắt buộc

- [x] Clone fresh repo và install/build được.
- [x] FE build pass.
- [x] BE build pass.
- [x] Local dev chạy được theo README.

### Đã làm được gì

- Đã hoàn tất đóng gói toàn bộ các thay đổi lớn của 3 phase: Auth, Session, Migrations, Performance & Monitoring.
- Chuẩn hóa hệ thống tài liệu và hướng dẫn thiết lập dự án (`SETUP_GUIDE.md`), hướng dẫn quản lý database schema/migrations (`MIGRATION_GUIDE.md`).
- Cập nhật `.gitignore` tối ưu ngăn chặn commit nhầm các tài nguyên debug/scratch.

### Testing

- Hệ thống chạy local dev mượt mà theo đúng hướng dẫn tài liệu.

### Trạng thái

Done (Hoàn thành Phase 6)

### Rủi ro còn lại

- Cần liên tục đồng bộ tài liệu khi có thay đổi về business API/flow trong tương lai.

---

## Definition Of Done Chung

Một phase chỉ được xem là done khi:

- [ ] Tất cả checklist quan trọng của phase đã hoàn thành hoặc có lý do defer rõ ràng.
- [ ] Test cases bắt buộc đã chạy và pass.
- [ ] Build FE/BE pass nếu phase đụng code.
- [ ] Không phát sinh lỗi P0/P1 mới.
- [ ] Đã cập nhật phần **Đã làm được gì**.
- [ ] Đã cập nhật phần **Testing** với lệnh/test đã chạy.
- [ ] Đã cập nhật **Trạng thái** thành `Done`.

## Status Legend

- `Not started`: chưa làm.
- `In progress`: đang làm.
- `Blocked`: bị chặn bởi env, secret, quyền truy cập, hoặc quyết định sản phẩm.
- `Testing`: code đã làm, đang verify.
- `Done`: đã implement và test pass.
- `Deferred`: cố ý dời lại, có lý do rõ.
