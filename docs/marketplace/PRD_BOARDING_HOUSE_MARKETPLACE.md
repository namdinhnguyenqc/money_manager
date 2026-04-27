# Boarding House Marketplace – PRD (Canary)

Tài liệu PRD này mô tả kế hoạch refactor và mở rộng hệ thống cho thuê/phòng trọ thành một marketplace có quy mô, đồng thời đảm bảo tương thích ngược và không gây regression. Nội dung bao gồm mô hình dữ liệu, API, thiết kế landing page mới, và chức năng tìm kiếm theo vị trí.

---

## 0. Tóm tắt mục tiêu và phạm vi
- Mục tiêu: Xây dựng marketplace cho thuê phòng (boarding houses) cho phép một tài khoản quản lý nhiều boarding houses, mỗi boarding house có nhiều phòng. Người dùng có thể duyệt boarding houses theo vị trí, xem chi tiết boarding house và danh sách phòng, và thực hiện các hành động như liên hệ/đăng ký xem.
- Phạm vi: BoardingHouse (mới), cập nhật Room (có boardingHouseId), migration dữ liệu, landing page thiết kế lại, tìm kiếm theo địa điểm, và API liên quan.
- Đảm bảo: backward compatibility và zero-regression với dữ liệu và logic hiện tại.

---

## 1. Nhân viên & Vai trò
- Guest: người truy cập landing, duyệt boarding houses, dùng bộ lọc địa lý, tương tác với CTA.
- User: người dùng đã đăng ký, có thể lưu boarding houses, xem danh sách và liên hệ với chủ nhà.
- Landlord: người cho thuê, có thể tạo và quản lý boarding houses và danh sách rooms.
- Admin: quản trị hệ thống; quản lý người dùng, boarding houses, rooms, dữ liệu và audit.
- System: migration runner, orchestration cho canary rollout và logging/audit.
- BA/PO/Dev/QA: các vai trò cho kickoff, thiết kế, phát triển và kiểm thử.

---

## 2. Dữ liệu & Mô hình
- BoardingHouse (mới)
  - id (PK)
  - name
  - address
  - owner_id (FK → users)
  - description (tùy chọn)
  - status (ACTIVE / INACTIVE)
  - created_at, updated_at
  - vị trí: province_code, district_code, ward_code; province_name, district_name, ward_name (patterns có indexing)
- Room (cập nhật)
  - id (PK)
  - boarding_house_id (FK → BoardingHouse)
  - price
  - status (AVAILABLE / OCCUPIED)
  - created_at, updated_at
  - (các trường hiện có vẫn giữ để đảm bảo tương thích)

Ghi chú: Các trường LOCATION được lưu trữ có cấu trúc (bộ môn indexing). BoardingHouse ownerId liên kết với Accounts; mỗi tài khoản có thể sở hữu nhiều BoardingHouse.

---

## 3. Migration/Dữ liệu (CRITICAL)
- Mục tiêu: đảm bảo không phá vỡ dữ liệu hiện tại.
- Hành động:
  1) Với mỗi Account có Room, tạo BoardingHouse mặc định (ví dụ: 'Default Property').
  2) Gán toàn bộ Rooms của account đó vào BoardingHouse tương ứng.
- Đảm bảo: không còn Room nào không gắn BoardingHouse.
- Backward compatibility: vẫn hỗ trợ Account → Rooms; thêm fallback khi cần.
- Migration sẽ thực hiện qua scripts hoặc ORM migrations có giao dịch và rollback.

---

## 4. Backend API
### 4.1 Endpoints
- GET /boarding-houses
  - Query: provinceCode, districtCode, wardCode (tùy chọn)
  - Response: [{ id, name, address, provinceName, districtName, wardName, availableRoomCount, minPrice }]
  - Logic: lọc theo vị trí nếu có; chỉ trả boarding houses có ít nhất 1 Room AVAILABLE và status ACTIVE.
- GET /boarding-houses/:id/rooms
- POST /boarding-houses
- PATCH /boarding-houses/:id
- PATCH /rooms/:id
- POST /rooms
- Auth endpoints: /auth/google, /auth/login, /auth/logout, /auth/me; RBAC sẽ áp dụng cho admin/landlord
- Admin endpoints: /admin/stats, /admin/users, ... (giữ nguyên hành vi hiện tại)

### 4.2 Mô hình dữ liệu & quan hệ
- Thêm BoardingHouse với trường location; index cho các trường location để tối ưu lọc.
- Cập nhật Room với boardingHouseId; đảm bảo tính nhất quán và tham chiếu khóa ngoại.
- Migration để ánh xạ Rooms hiện có sang BoardingHouse mới.

---

## 5. Landing Page (web-landing) – Hành vi mới
### 5.1 Hiển thị & Lọc
- Hiển thị danh sách BoardingHouse dưới dạng thẻ, tổng hợp từ tất cả accounts.
- Mỗi thẻ hiển thị: tên, địa chỉ, số phòng AVAILABLE, giá bắt đầu.
- Lọc theo 3 dropdown cấp: Tỉnh, Quận, Phường (cascade).
- Gọi API GET /boarding-houses?provinceCode=...&districtCode=...&wardCode=... khi lọc.
- Edge cases: empty state, lỗi API, lọc dạng partial.

### 5.2 UI/UX
- Card thao tác để xem chi tiết boarding house (rooms list).
- Scroll dọc với snapping có thể bật/tắt và tối ưu cho mobile/desktop.
- Accessibility để đảm bảo dùng được bằng bàn phím và có thông tin trợ giúp.

---

## 6. Location-based Filtering (Frontend)
- 3 dropdown cascading (Province → District → Ward)
- Vận hành: load tỉnh khi vào; load quận sau khi chọn tỉnh; load phường sau khi chọn quận
- Kết quả filter gọi GET /boarding-houses với tham số tương ứng; partial filters được hỗ trợ
- Không chọn tham số nào → hiển thị danh sách như hiện tại

---

## 7. Edge Cases & Resilience
- Không có BoardingHouses: hiển thị empty state hợp lý
- Không có phòng AVAILABLE: ẩn boarding house khỏi danh sách
- Lỗi API: hiển thị thông báo lỗi và fallback UI
- Partial filters: kết quả hợp lệ

---

## 8. Bảo mật & Tương thích ngược
- Tương thích ngược: API cũ vẫn hoạt động và có fallback khi cần
- RBAC và audit cho các hành động quản trị (Admin/Landlord)
- Migration có rollback và logging đầy đủ

---

## 9. Yếu tố phi chức năng
- Hiệu suất: index cho location, guest, và rooms; pagination/lazy load cho danh sách
- Bảo mật: authentication, authorization, audit
- Truy cập và accessibility: WCAG basics

---

## 10. Deliverables & Milestones
- DB schema cập nhật; Migration scripts
- Backend API endpoints (boarding_houses) & related routes
- Landing UI (web-landing) with location filters
- Admin UI cập nhật để quản lý boarding houses/rooms
- Tài liệu PRD, API contracts, migration plan
- Kế hoạch QA và regression test
- Kế hoạch rollout Phase 5 (Canary → Pilot → Production)

---

## 11. Rủi ro & Mitigation
- Migration risk: có thể mất dữ liệu hoặc mapping sai; mitigations include backup, tests, và rollback plan
- Hiệu suất với dataset lớn; mitigations include indexing và pagination
- Compatibility gaps; mitigations include fallback logic và mocks
- RBAC gaps; mitigation bằng audit và kiểm thử API

---

## 12. Lộ trình & Next Steps
- Kickoff LP-RD cho thuê/phòng trọ: xác nhận content, KPI và acceptance criteria
- Implement BoardingHouse model và migration trên DB thật (staging/production)
- Implement API endpoints và integrate landing page với location-based filtering
- Fill content thực tế cho landing và chuẩn bị demo/kickoff
- Chuẩn bị test plan và test cases (manual và automated)
- Chuẩn bị canary/pilot rollout và monitoring dashboards

---

## 13. Open Issues (Current Issues)
- I-1 Migration risk và rollback kế hoạch
- I-2 Backward compatibility với Account → Rooms
- I-3 Quyết định đăng nhập Google cho landing (guest) hay chỉ admin
- I-4 Độ chính xác và indexing của trường location
- I-5 Tính ổn định của cascading dropdown (nguồn dữ liệu ngoài, cache, fallback)
- I-6 Edge cases landing (empty state, partial filters)
- I-7 RBAC & audit cho actions landing content
- I-8 Security & testability
- I-9 Test plan cho migration và landing (Playwright/Cypress)
- I-10 Cập nhật docs và API contracts
