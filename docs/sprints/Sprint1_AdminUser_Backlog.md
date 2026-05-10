Sprint 1 – Admin + User MVP Backlog (Canary)

Mục tiêu
- Hoàn thiện đầy đủ luồng Admin và User (Owner) trong MVP. Landing sẽ được đưa vào Sprint2. 1 Account có thể sở hữu nhiều BoardingHouses (1:N).

Phân loại task
- Data Model & Migration
- Backend API MVP
- Admin UI MVP
- Owner UI MVP
- Acceptance Criteria & QA plan
- Documentation

1) Data Model & Migration (DB)
US-SP1-MIG-001: Add owner_id to BoardingHouses (1:N Owner→ BoardingHouse)
- Mô tả: BoardingHouses có owner_id tham chiếu users(id), 1 account có thể sở hữu nhiều boarding houses
- Acceptance:
  - boarding_houses.owner_id có FK tới users(id)
  - indexing: idx_boarding_houses_owner_id
- Status: In Progress / Planned

US-SP1-MIG-002: Map Rooms to Default BoardingHouse per Account
- Mô tả: Seed BoardingHouse mặc định cho mỗi account có rooms và ánh xạ rooms sang boarding_house_id tương ứng
- Acceptance:
  - Mỗi account có boarding house và rooms được gắn đúng
  - Không còn room thiếu liên kết (NULL boarding_house_id)
- Status: Planned

2) Backend API – MVP Core
US-SP1-API-AD-001: Admin - List Users
- Endpoints: GET /api/admin/users
- Acceptance: trả danh sách users, hỗ trợ filter/sort, hành động khóa/mở và đổi vai trò có xác nhận & audit logs

US-SP1-API-AD-002: Admin - Patch User Status
- Endpoint: PATCH /api/admin/users/:id/status
- Acceptance: cập nhật trạng thái (ACTIVE/BLOCKED/DELETED) và audit log

US-SP1-API-AD-003: Admin - Patch User Role
- Endpoint: PATCH /api/admin/users/:id/role
- Acceptance: đổi vai trò và log

US-SP1-API-AD-004: Admin - BoardingHouses CRUD
- Endpoints: GET/POST/PATCH for boarding_houses
- Acceptance: create/edit/delete boarding houses; toggle status/public

US-SP1-API-AD-005: Admin - Rooms CRUD
- Endpoints: GET/POST/PATCH for rooms
- Acceptance: create/edit/delete rooms; update status/isPublic

US-SP1-API-AD-006: Admin - Dashboard (Stats)
- Endpoint: GET /api/admin/stats
- Acceptance: trả về các metrics tổng quan

US-SP1-API-OW-001: Owner Dashboard Stats
- Endpoint: GET /api/owner/dashboard/stats
- Acceptance: metrics theo owner

US-SP1-API-OW-002: Owner - BoardingHouses CRUD
- Endpoints: POST /api/owner/boarding-houses, GET/PATCH
- Acceptance: CRUD boarding houses, liên kết với owner_id

US-SP1-API-OW-003: Owner - Rooms CRUD
- Endpoints: POST /api/owner/boarding-houses/:id/rooms, PATCH /rooms/:id
- Acceptance: CRUD rooms, liên kết boarding_house_id và update trạng thái

3) Admin UI MVP
US-SP1-UI-AD-001: Admin Users Management UI
- Skeleton UI cho danh sách users, modal xác nhận cho actions
- Acceptance: đúng flow xác nhận; integrate with API

US-SP1-UI-AD-002: Admin BoardingHouses UI
- Skeleton CRUD; status/isPublic toggle; list view
- Acceptance: wired với API

US-SP1-UI-AD-003: Admin Rooms UI
- Skeleton CRUD; list/ edit room
- Acceptance: wired với API

4) Owner UI MVP
US-SP1-UI-OW-001: Owner BoardingHouses creation
- Skeleton create boarding house form
- Acceptance: data mapping owner_id

US-SP1-UI-OW-002: Owner Rooms management
- Skeleton add/edit room; manage isPublic
- Acceptance: mapping to boarding house

5) Landing (Sprint 2) – chuẩn bị seed data
- US-LP-CTA: 3 cấp lọc (Province/District/Ward) (không bắt buộc ở Sprint1)
- US-LP-CARDS: BoardingHouse cards hiển thị (name, address, available rooms, min price)

6) Quy trình & DoD Sprint 1
- DoD: Code compile; unit tests; migration scripts; Admin UI skeleton; API core wiring; login admin; PRD/Sprint 1 doc
- Acceptance: 100% US ở Sprint 1 đạt DoD

7) Risks & Mitigations
- migration mapping và 1:N: cần test staging; rollback plan
- RBAC và audit: bắt đầu với MVP; mở rộng sau
- Landing: seed data delay; plan khi phê duyệt content

8) Deliverables cho Sprint 1
- Sprint1_AdminUser.md (cập nhật đầy đủ US và acceptance)
- Migration scripts (004/005) và docs migration plan
- PRD MVP Flow (Vietnamese) + kickoff agenda
- Patch UI skeleton (admin/owner) và API scaffolding
- Data seeds cho demo (seed landing data placeholder) 

9) Next actions
- Gửi cho Senior BA/PO: Sprint 1 backlog chi tiết (US-xxx) với Acceptance Criteria đầy đủ.
- Chuẩn bị kickoff: agenda và slide notes
- Thiết lập staging để migrate và test flow MVP (Admin + Owner) và verify 1:N mapping

10) QA Regression – Module phòng trọ

Scope hiện tại: Owner vận hành cơ sở/phòng, tạo hợp đồng, tạo hóa đơn, ghi nhận thu tiền. Chưa test trong Sprint 1: yêu cầu thuê, chat, notification push/email.

P0 regression cases
- RT-001 Create room in facility context
  - Route: `/facilities/:facility_id`
  - Steps: vào cơ sở, bấm `Thêm phòng`, nhập số phòng và giá thuê/tháng, submit.
  - Expected: phòng mới xuất hiện trong tab Phòng, không cần user nhập `facility_id`, API tạo đúng cơ sở hiện tại.
- RT-002 Create contract happy case
  - Route: `/contracts/new?room_id=:room_id&facility_id=:facility_id`
  - Steps: chọn phòng trống, nhập tenant hợp lệ, nhập thời hạn/chỉ số đầu kỳ, tạo hợp đồng.
  - Expected: navigate sang `/contracts/:id`, phòng chuyển sang trạng thái đang thuê.
- RT-003 Tenant validation regression
  - Payload bug cũ: `{ name: "Khách A", phone: "1", email: "0927368772@gmail.com", idCard: "1" }`
  - Expected: FE hiển thị lỗi `Số điện thoại phải có 10 số` và `CCCD phải có đúng 12 số`; không gọi API tạo tenant; không hiện Next runtime overlay.
- RT-004 Invoice creation from contract
  - Route: `/invoices/new?contract_id=:contract_id`
  - Steps: nhập chỉ số điện/nước cuối kỳ, tạo và gửi luôn.
  - Expected: navigate sang `/invoices/:id`, bảng chi phí có tiền phòng, điện, nước, tổng tiền.
- RT-005 Payment collection
  - Route: `/payments/new?invoice_id=:invoice_id`
  - Steps: xác nhận thu tiền đủ.
  - Expected: invoice cập nhật đã thanh toán, có transaction/lịch sử thu tiền, navigate về `/invoices/:id`.
- RT-006 Payment history
  - Route: `/payments`
  - Steps: sau khi RT-005, vào lịch sử thu tiền.
  - Expected: thấy dòng thu tiền đúng phòng/khách/số tiền/hóa đơn liên quan.

Automated coverage hiện có
- Unit: `web-admin/__tests__/rentalOps.validation.test.tsx`
  - Chặn phone/idCard sai trước khi gọi `/rental/tenants`.
  - Xác nhận field error cho phone, idCard, email.
  - Xác nhận tenant hợp lệ pass validation.
- E2E: `web-admin/tests/e2e/owner-rental-billing-flow.spec.ts`
  - Happy case full flow: cơ sở → thêm phòng → tạo hợp đồng → tạo hóa đơn → thu tiền → lịch sử thu tiền.
  - Regression: form tạo hợp đồng chặn payload tenant sai và không crash runtime.
