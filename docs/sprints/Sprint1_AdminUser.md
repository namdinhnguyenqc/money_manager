Sprint 1 – Admin + User MVP (Canary)

Mục tiêu
- Hoàn thiện đầy đủ luồng Admin và User (Owner) ở MVP, landing tạm bỏ qua ở Sprint 1.
- 1 Account có thể sở hữu nhiều BoardingHouses (1:N) và mỗi BoardingHouse có nhiều Rooms.
- Chuẩn hóa API, migration và UI skeleton để có nền cho RBAC mở rộng sau.

Phạm vi Sprint 1 (In-scope)
- Data Model: BoardingHouse và Rooms with 1:N relation (owner_id trên BoardingHouse, boarding_house_id trên Rooms).
- Migration: tạo BoardingHouse mặc định cho mỗi account và ánh xạ Rooms sang BoardingHouse đó.
- Backend API Core (Public/Owner/Admin): nhanh chóng wiring các endpoint trọng yếu để phát triển UI Admin và Owner.
- Admin UI skeleton: Users, BoardingHouses, Rooms; ConfirmDialog; RBAC skeleton.
- Owner flows: create boarding houses, add rooms, update room status, toggle public, view leads ( khung UI + API wiring ).
- Landing: để Sprint 2 (seed data cho demo, 3 cấp lọc location) – không triển khai full ở Sprint 1.
- Documentation: cập nhật PRD MVP Flow, Sprint1 doc và kickoff material.

Đã Done (Done)
- Landing: cuộn dọc, 5 sections; toggles snapping/smooth; data seed placeholder
- Admin: Google login (/api/auth/google); Admin layout; Users page với ConfirmDialog; patch admin/users và admin/stats skeleton
- Data Model: BoardingHouse entity với location; Room cập nhật boardingHouseId; migration plan khung
- API: /auth/google, /boarding-houses skeleton, shared API layer
- Documentation: PRD Boarding House Marketplace (VI), Sprint 1 doc

Backlog Sprint 1 (Detailed)
1) US-SP1-AD-001 Admin: Đăng nhập bằng Google và cấp token
- Status: DONE (Phát hành MVP) – acceptance: Admin có thể đăng nhập và nhận token để call API quản trị.

2) US-SP1-AD-002 Admin: Quản lý Users (list, block/unblock, đổi vai trò)
- Acceptance:
  - Admin xem danh sách users; có thể filter/sort; thực hiện khóa/mở, đổi vai trò với xác nhận; audit log ghi nhận.

3) US-SP1-AD-003 Admin: Quản trị BoardingHouses (CRUD + status + isPublic)
- Acceptance:
  - Admin có thể tạo/sửa/xóa BoardingHouse; cập nhật status và isPublic; thay đổi hiển thị trên frontend ngay khi lưu.

4) US-SP1-AD-004 Admin: Quản trị Rooms (CRUD + status + isPublic)
- Acceptance:
  - Admin có thể tạo/sửa/xóa Room; cập nhật status/isPublic; room thuộc boarding house của Owner; visible trên public theo rule.

5) US-SP1-AD-005 Admin: Dashboard tổng quan
- Acceptance: tổng hợp counts (users, boarding houses, rooms) và hiển thị dashboard; có update giữa các thao tác.

6) US-SP1-AD-006 Admin: Audit logs
- Acceptance: logging cơ bản cho actions quản trị (thay đổi user, boarding house, room).

7) US-SP1-OW-001 Owner: Tạo BoardingHouse mới
- Acceptance: boarding house được tạo và gắn với owner; có location fields (provinceCode, districtCode, wardCode).

8) US-SP1-OW-002 Owner: Thêm Room vào BoardingHouse
- Acceptance: thêm room và liên kết với boarding_house_id; giá và trạng thái được lưu.

9) US-SP1-OW-003 Owner: Cập nhật trạng thái Room
- Acceptance: change status, update ngày, và effect public visibility tùy policy MVP.

10) US-SP1-OW-004 Owner: Toggle isPublic cho Room
- Acceptance: isPublic cập nhật và room hiển thị/ẩn trên public theo đúng rule.

11) US-SP1-OW-005 Owner: Xem leads từ Guest
- Acceptance: Lead list có thể xem và cập nhật trạng thái.

12) US-SP1-MIG-001 Migration: 1:N Mapping
- Acceptance: migration mapping 1:N (account -> boarding houses -> rooms) làm đúng; tự động gắn rooms vào boarding houses mới.

13) US-SP1-LP-Seed: Landing seed data
- Acceptance: data seed cho landing để demo nhanh (không bắt buộc MVP, có thể dùng data mock).

Definition of Done (DoD) Sprint 1
- Code compile, unit tests, lint pass.
- API core wired (Public/Owner/Admin) cho MVP flows.
- Migration scripts viết và có test trên staging với dữ liệu mẫu.
- Admin UI skeleton hoạt động (Users/BoardingHouses/Rooms) với ConfirmDialog.
- Landing data seed và 3 cấp lọc location được chuẩn bị để Sprint 2.
- Documentation cập nhật: Sprint 1 backlog US; PRD; kickoff notes.

Phân chia rủi ro và phụ thuộc
- Rủi ro migration mapping: cần test kỹ ở staging và có rollback.
- Quyền truy cập Admin/Owner đúng, RBAC chuẩn cho MVP – có thể mở rộng sau.
- Landing content và data seed cần phê duyệt của BA/PO – để Sprint 2 đưa vào kích hoạt real data.

Kí hiệu và cách sử dụng tài liệu
- Đây là tài liệu nội bộ cho kickoff Sprint 1. Các US sẽ được mở rộng thành backlog chi tiết (US-PRD) sau khi BA/PO duyệt.

Ký tên phê duyệt:
- Sponsor/BA/PO: ____________________
- Tech Lead: _______________________
- Product Owner: ___________________
