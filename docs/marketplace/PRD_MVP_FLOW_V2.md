# MVP Flow – Boarding House Marketplace (Việt Nam, Canary)

Phiên bản MVP tập trung cho 3 vai trò chính: Guest, Owner, Super Admin. Landing page sẽ được ưu tiên sau khi MVP Admin/User ổn định. Tài liệu này mô tả đầy đủ flow, API contracts, data model, UI/UX và backlog để triển khai nhanh và có thể mở rộng sau.

---

## 1. Product Vision MVP
- Xây dựng một marketplace cho thuê/phòng trọ cho phép một tài khoản quản lý nhiều BoardingHouses; mỗi BoardingHouse có nhiều Rooms.
- Cung cấp trải nghiệm tìm kiếm theo vị trí (location-based filtering) và hiển thị boarding houses có rooms còn trống với giá khởi điểm.
- 3 vai trò MVP: Guest (không đăng nhập), Owner (chủ trọ/quản trị dãy), Super Admin (quản trị hệ thống).
- Sử dụng API chung và business logic đồng nhất giữa Web Landing, Admin và Mobile, với RBAC cơ bản cho MVP và mở rộng sau.

---

## 2. Vai trò (Role MVP)
 - Guest: Người tìm trọ chưa đăng nhập. Có quyền duyệt landing, lọc theo Location, xem chi tiết boarding houses và phòng, gửi liên hệ. Không đăng nhập, không lưu danh sách.
 - Owner: Chủ trọ/quản lý dãy trọ. Đăng nhập và quản lý boarding houses và rooms của mình; bật/tắt public listing; xem lead từ Guest; quản lý dashboard căn bản.
 - Super Admin: Quản trị viên cấp cao. Đăng nhập, quản lý toàn hệ thống (users, boarding houses, rooms), kiểm duyệt nội dung, xem audit logs, và thiết lập canary/pilot/production (ở giai đoạn sau).

Các vai trò khác như Customer/Property Manager/Staff/Listing Manager sẽ được xem xét để mở rộng sau MVP và được mô tả trong kế hoạch RBAC mở rộng.

Khuyến nghị: MVP bắt đầu với 3 vai trò trên và thiết kế hệ thống để có thể mở rộng RBAC sau.

---

## 3. Permission Matrix (MVP)
 - Guest:
   - Public access to API: GET /api/public/ boarding-houses, /public/rooms (không cần token)
   - Tất cả data công khai; không có quyền viết
 - Owner:
   - Đăng nhập và xác thực (token).
   - Xem/Quản lý boarding houses thuộc owner (owner_id = currentUser.id)
   - Tạo/Chỉnh sửa/Xóa rooms thuộc boarding houses của mình
   - Cài đặt isPublic cho rooms, xem lead từ Guest, ghi điện nước/hoá đơn trong phạm vi dãy trọ của mình
 - Super Admin:
   - Toàn quyền hệ thống: xem/quản lý users, boarding houses, rooms, audit logs, và nội dung public

Gợi ý mở rộng sau: thêm bảng roles/permissions và mapping (RBAC dựa trên quyền) thay vì chỉ dựa vào User.role.

---

## 4. UI Flow cho từng vai trò (High-level)
### 4.1 Guest UI Flow
- Entry: Landing Page (Public Marketplace)
- Flow:
  1. Guest vào landing
  2. Tìm kiếm/ lọc theo Location (3 dropdown cascade) và lọc theo giá, tiện ích, trạng thái phòng
  3. Xem danh sách boarding houses; mỗi card hiển thị name, address, availableRooms, minPrice
  4. Click một boarding house để xem detail (nếu có) và danh sách rooms còn trống
  5. Gửi liên hệ hoặc gọi/Zalo chủ trọ nếu công khai
- Không có lưu danh sách hay chat real-time cho MVP

### 4.2 Owner UI Flow
- Entry: Đăng nhập Owner -> Home/Dashboard
- Flow:
  1. Tạo/duyệt danh sách boarding houses của mình
  2. Tạo mới boarding house: nhập tên, địa chỉ, mô tả, location, ảnh, trạng thái public
 3. Quản lý rooms: thêm/sửa/xóa rooms, cập nhật price, status, isPublic
 4. Quản lý lead từ Guest: xem danh sách contact requests, cập nhật trạng thái
 5. Xem dashboard cơ bản: lead, doanh thu, phòng trống
- MVP không bắt buộc quản lý员工/nhân sự, điện nước, hoá đơn phức tạp (sẽ bổ sung sau)

### 4.3 Super Admin UI Flow
- Entry: Đăng nhập Super Admin -> Admin Dashboard
- Flow:
  1. Xem dashboard tổng quan (users, boarding houses, rooms, lead, traffic)
  2. Quản lý users: tạo, khóa/mở, đổi vai trò
  3. Quản lý boarding houses/rooms toàn hệ thống: duyệt, khóa/khóa, bật/tắt public
 4. Xem và duyệt nội dung, audit logs
 5. Quản lý content landing (nội dung public)
- MVP: admin dashboard, quản lý users/boarding houses/rooms có UI skeleton và API wiring

---

## 5. Danh sách màn hình MVP
- Public Marketplace (Landing):
  - Landing page (public)
  - BoardingHouse detail (danh sách rooms nếu có)
- Owner Dashboard:
  - Owner login
  - Boarding Houses list
  - Create Boarding House
  - Boarding House detail (rooms); Add Room
  - Room detail/edit
  - Lead/Contact Requests
- Super Admin Dashboard:
  - Admin login
  - Dashboard tổng quan
  - Users list (manage)
  - Boarding Houses (list & detail)
  - Rooms (list & detail)
  - Audit logs
  - Content moderation (basic)
- Shared API (điểm chung, backend):
  - Public: boarding_houses, rooms
  - Owner: boarding_houses, rooms
  - Admin: users, boarding_houses, rooms, contact-requests, audit-logs

---

## 6. API Contract MVP (tóm tắt)
- Public
  - GET /api/public/boarding-houses?provinceCode=&districtCode=&wardCode=
  - Response: { data: [{ id, name, address, provinceName, districtName, wardName, availableRoomCount, minPrice }] }
- Owner
  - POST /api/owner/boarding-houses
  - GET /api/owner/boarding-houses
  - PATCH /api/owner/boarding-houses/:id
  - POST /api/owner/boarding-houses/:id/rooms
  - PATCH /api/owner/rooms/:id
- Admin
  - GET /api/admin/users
  - PATCH /api/admin/users/:id/status
  - PATCH /api/admin/users/:id/role
  - GET /api/admin/boarding-houses
  - PATCH /api/admin/boarding-houses/:id/status
  - GET /api/admin/rooms
  - PATCH /api/admin/rooms/:id/status
- Authentication
  - POST /api/auth/google
  - GET /api/auth/me

Lưu ý: các payload/response chi tiết sẽ được hoàn thiện trong backlog và ghi rõ ở từng US khi phê duyệt.

---

## 7. Data Model MVP (bản đồ nhanh)
- BoardingHouse: id, name, address, ownerId, description, status, isPublic, provinceCode, districtCode, wardCode, provinceName, districtName, wardName, createdAt, updatedAt
- Room: id, boardingHouseId, price, status, isPublic, createdAt, updatedAt, (các trường hiện có để đảm bảo backward compatibility)
- User (tạm): id, name, email, role (OWNER, SUPER_ADMIN), status, createdAt, updatedAt

---

## 8. Business Rules (gợi ý)
- Public data phải có status ACTIVE và isPublic = true
- Owner chỉ thao tác dữ liệu thuộc boarding houses của mình
- Super Admin có quyền toàn hệ thống
- Khi room chuyển sang OCCUPIED, isPublic sẽ tự động về false (nếu quy tắc này được áp dụng ở MVP)
- Migration map Account → BoardingHouse và gắn Rooms, cần phê duyệt và test kỹ theo data mẫu

---

## 9. Acceptance Criteria (MVP)
- A. Guest Flow:
  - Guest có thể xem landing, lọc theo Location, xem boarding houses và rooms, gửi liên hệ.
  - Không cho lưu/bình luận/đánh giá nếu chưa đăng nhập.
- B. Owner Flow:
  - Owner có thể đăng nhập, tạo boarding house, thêm/quản lý rooms, toggle public, xem leads.
  - Quản lý public visibility và lead state (NEW/SCHEDULED/ CLOSED).
- C. Super Admin Flow:
  - Super Admin có thể xem dashboard, quản lý users/boarding houses/rooms, audit logs, và kiểm duyệt nội dung.
- D. Data Migration:
  - Dữ liệu migration hoàn tất mà không mất dữ liệu; mapping boardhouses và rooms đúng với owner.
- E. Performance & Security:
  - RBAC cơ bản, audit logs, và indexing location.
- F. Landing (nội dung prospective):
  - Landing có thể tích hợp chung API sau khi MVP ổn định.

---

## 10. Backlog User Stories (dành cho Sprint 1 – Admin + User MVP)
1. US-MVP-AD-001 Admin: Đăng nhập bằng Google và cấp token cho client
2. US-MVP-AD-002 Quản lý Users: danh sách, khóa/mở, đổi vai trò
3. US-MVP-AD-003 Boarding Houses Admin: CRUD (tạo, sửa, xoá, status, isPublic)
4. US-MVP-AD-004 Rooms Admin: CRUD & status/public
5. US-MVP-AD-005 Leads/Contact Requests: xem và cập nhật trạng thái
6. US-MVP-PUBLIC-01 Public: GET /boarding-houses với lọc vị trí và trạng thái
7. US-MVP-PUBLIC-02 Boarding House Detail (nội dung và rooms ở chế độ chi tiết) – MVP optional
8. US-MVP-ROUTING-01 Shared API: đồng bộ hóa API giữa web-admin/mobile
9. US-MVP-DB-01 Migration: Create BoardingHouse default per account, gắn rooms
10. US-MVP-RBAC-01 Basic Role: Guest/Owner/Super Admin và logic access cơ bản
11. US-MVP-UI-01 Admin UI Skeleton: quản trị boardhouses, rooms, users
12. US-MVP-UI-01 Landing UI Skeleton: location filter và danh sách boarding houses (data mô phỏng)

Lưu ý: Đây là backlog sơ bộ và sẽ được tinh chỉnh sau khi BA/PO phê duyệt.

---

## 11. Sprint hướng dẫn (Gợi ý)
- Sprint 1: API core + Admin + User skeleton + Migration plan
- Sprint 2: Public Landing (location filter) + BoardingHouse card + Detail (nội dung) (landing process theo flow MVP)
- Sprint 3: Ownership features (Lead, invoices, utilities – extendable)
- Sprint 4: Compliance, audit logs, performance tuning, canary/pilot prep

---

## 12. Reference & Research
- RBAC và Permission best practices (RBAC và ABAC): các resource tham khảo như Auth0 RBAC, Microsoft Docs.
- Data migration best practices: zero-downtime migrations, backup/rollback plan.
- API design và versioning: REST vs GraphQL, versioning strategy, error handling.
- Marketplace design patterns: multi-tenant architecture, property management systems.

Bạn có thể duyệt nội dung này và cho mình xác nhận rằng tài liệu này đã phù hợp để chuyển sang backlog US và kickoff hay bạn muốn bổ sung/loại bỏ phần nào không?
