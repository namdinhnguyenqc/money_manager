# Luồng đầy đủ Admin và User (Flow) – Canary

Mục tiêu: Chuẩn hóa toàn bộ product flow cho backend (Shared API), Admin và User, tạm bỏ qua Landing cho thời điểm hiện tại để tập trung hoàn thiện các luồng quản trị và người dùng. Yêu cầu được duyệt bởi Senior BA/PO trước khi triển khai, design UI/UX tối ưu, tiến hành dev, QA và nghiệm thu theo quy trình nghiêm ngặt.

1. Bối cảnh tổng quan
- Hiện tại landing page có 5 section và có location-based filtering (đang ở trạng thái skeleton cho landing). Landing sẽ được xem như public content và sẽ kết nối với API chung. Landing sẽ được ưu tiên trong giai đoạn sau khi Admin/User flows ổn định.
- Admin login bằng Google đã tích hợp và hệ thống quản trị gồm Users, Boardings/Houses và Rooms skeleton với RBAC cơ bản.
- Data model hiện tại đã bổ sung BoardingHouse và liên kết Rooms bằng trường boardingHouseId; Migration strategy đang chuẩn bị (không gây mất dữ liệu).
- Mọi API core nên được chuẩn hóa để có thể chia sẻ giữa web, admin và mobile.

2. Vai trò và luồng người dùng (Roles & Flows)
- Guest (Chưa đăng ký): duyệt landing (sau này), tìm kiếm và xem detail boarding houses/rooms. Không lưu/tracking hành động chứ chưa có login.
- Customer / User: đăng nhập; lưu danh sách yêu thích; gửi yêu cầu xem; theo dõi trạng thái lead; nhận notification; quản lý profile.
- Owner / Property Manager: quản lý boarding houses và rooms của từng dãy; bật/tắt visibility; quản lý tenants; ghi điện nước; hoá đơn; quản lý nhân sự; phân quyền theo dãy.
- Admin / Super Admin: quản lý hệ thống (users, boarding houses, rooms), audit logs, kiểm duyệt nội dung, dashboard, canary/pilot/production rollout.

3. Mô hình dữ liệu (Data Model) – Đã chuẩn hóa
- BoardingHouse (entity mới)
  - id, name, address, ownerId, description, status, isPublic, createdAt, updatedAt
  - location: provinceCode, districtCode, wardCode, provinceName, districtName, wardName (có index)
- Room
  - id, boardingHouseId, price, status, isPublic, createdAt, updatedAt
- Accounts (existing) vẫn giữ nguyên; mỗi Account có thể có nhiều BoardingHouse.
- Các trường location được indexed để hỗ trợ filtering và performance.

4. Migration & Backward Compatibility
- Migration strategy (khung, cần implement):
  - Với mỗi Account có Rooms: tạo BoardingHouse mặc định; gán tất cả Rooms của account vào boarding_house_id mới.
  - Đảm bảo không còn Room không có boardingHouseId sau migration.
  - Bản vá fallback: nếu có logic cũ Account → Rooms, implement alias/fallback đến BoardingHouse.
- Backward compatibility: các API hiện có (ví dụ landing /boarding-houses) vẫn có thể hoạt động; tối ưu sau khi migrations ổn định.

5. API – Public/Shared/Admin (điểm lõi hiện tại & cần hoàn thiện)
- Public /boarding-houses (GET): filter theo provinceCode, districtCode, wardCode; trả danh sách boarding houses có ít nhất 1 Room AVAILABLE và status ACTIVE; trả: id, name, address, provinceName, districtName, wardName, availableRoomCount, minPrice.
- Admin /admin/users (GET, PATCH status, PATCH role, DELETE): quản trị người dùng, RPC log.
- Admin /admin/boarding-houses (CRUD): quản trị boarding houses, toggle status/public
- Admin /admin/rooms (CRUD): quản trị rooms, status/public
- /auth/google (Admin login) và /auth/me (Lấy thông tin user và role, RBAC)
- Shared API layer: apiClient helper, token management, error handling, and standard response format
- Landing + Admin + Owner + Public đều sẽ dùng chung backend API (định danh tài nguyên, các action, và permission checks).

6. Landing Page – Public Marketplace (Module 1 – Public Marketplace – Landing) – chưa bỏ qua
- Sau khi Admin/User flows ổn định, Landing sẽ hiển thị BoardingHouse cards cho người tìm trọ với: tên, địa chỉ, số phòng AVAILABLE, price bắt đầu.
- Lọc: 3 cấp độ Location (Tỉnh, Quận, Phường); lọc theo giá; kích hoạt full text/search; show related suggestions.
- Kết nối với API /boarding-houses (và có thể /boarding-houses/:id cho chi tiết) – nhằm đảm bảo dữ liệu phù hợp và cập nhật real-time nếu có.
- Public visibility logic: boardingHouse.status ACTIVE và isPublic true; Room.status AVAILABLE và isPublic true.

7. UI/UX và Flow – các bước thực thi
- Step 1: Require (BA) – Senior BA/PO duyệt các require và acceptance criteria cho Admin/User flows (gắn vào backlog).
- Step 2: Senior UI/UX design – create wireframes và mockups từ flows hiện tại (Admin/User) với sự ưu tiên cho trải nghiệm quản trị và người dùng.
- Step 3: Development – dev theo chuẩn backend API; UI components reuse và consistent across modules
- Step 4: QA – review flows, perform functional tests, regression tests, and cross-device tests
- Step 5: Bug fix – fix và retest; re-run QA
- Step 6: BA/PO nghiệm thu – xác nhận flow đúng với acceptance criteria và PRs được merge/release.

8. Acceptance Criteria (Mẫu cho các tính năng chính)
- Admin: Quản lý Users (list, block/unblock, change role), BoardingHouses (CRUD, status, isPublic), Rooms (CRUD, status, isPublic), Audit Logs dynamics.
- User: Đăng nhập/đăng ký (tùy chọn), xem danh sách boarding houses, lưu yêu thích, gửi liên hệ, theo dõi lead.
- Guest: Duyệt landing công khai và tìm kiếm boarding houses theo location; xem chi tiết boarding house/room; gửi liên hệ.
- Landing: Location filters cascaded; danh sách boarding houses hiển thị với số phòng AVAILABLE và minPrice; no horizontal scroll when using the landing UI.
- Migration: không mất dữ liệu; gắn Rooms cho BoardingHouse mặc định; verify bằng test data.
- Security: RBAC đầy đủ; audit logs cho actions quản trị và content landing.
- Performance: indexing location fields; tối ưu query cho GET /boarding-houses với giả định dataset có thể lên tới vài nghìn boarding houses.

9. Ràng buộc và nguồn lực
- Yêu cầu từ BA/Senior BA/PO về scope và acceptance criteria được ghi nhận và phê duyệt trước khi dev.
- Các UI/UX phải tối ưu UX và accessibility.
- Đảm bảo backward compatibility và zero-regression cho data migration.
- Landing sẽ được tách riêng cho giai đoạn sau khi Admin/User flow hoàn thiện.

10. Research/Best practices (định hướng tham khảo – links có thể tham khảo sau):
- RBAC best practices: https://auth0.com/docs/authorization/rbac
- Data migration strategies with zero-downtime: https://aws.amazon.com/blogs/database/migrating-databases-without-downtime/
- API design & versioning: https://www.ietf.org/id/draft-ietf-httpbis-api-versioning-00.html
- Designing scalable marketplace platforms: https://microservices.io/patterns/data/database-per-service.html
- Location-based search indexing: https://developers.google.com/maps/documentation/geocoding-start

11. Next steps
- Bạn duyệt nội dung này và xác nhận scope: Admin + User flows hoàn thành, Landing để sau.
- Mình sẽ dựa trên xác nhận của bạn để cập nhật backlog US (viết bằng tiếng Việt với acceptance criteria cụ thể), và chuẩn bị kickoff tài liệu (agenda/notes) cho bước thiết kế UI/UX.

Chú ý: Tài liệu này là nguồn tham khảo để kickoff và làm rõ scope; các thay đổi chi tiết sẽ được patch vào repo khi bắt đầu sprint thực tế.
