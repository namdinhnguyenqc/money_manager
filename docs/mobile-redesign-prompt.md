# PROMPT — Redesign toàn bộ giao diện Mobile App "TrọCare"

## 0. Bối cảnh & yêu cầu bắt buộc

Bạn là senior product designer. Hãy **thiết kế lại (redesign) toàn bộ UI** của app mobile **TrọCare** — ứng dụng quản lý nhà trọ/phòng cho thuê dành cho **chủ trọ**, viết bằng **Expo / React Native (expo-router)**.

**Ràng buộc tuyệt đối:**
- **Giữ nguyên 100% tính năng** của từng màn hình (mô tả bên dưới) — không bỏ, không gộp mất chức năng.
- **Giữ nguyên hệ màu thương hiệu**: primary `#2563EB`, teal `#06B6D4`, gradient thương hiệu `135deg #2563EB→#06B6D4`, nền `#F8FAFC`, navy `#0F172A`, success `#10B981`, warning `#F59E0B`, danger `#EF4444`, border `#E2E8F0`, text phụ `#64748B`.
- Font: **Be Vietnam Pro / Plus Jakarta Sans** (như hiện tại).
- Ngôn ngữ: **Tiếng Việt**.
- Mỗi màn cần thiết kế đủ **4 trạng thái**: loading (skeleton), empty (icon + gợi ý + CTA), error (thử lại), có dữ liệu.
- Mobile-first, chạm dễ (nút ≥ 44px), an toàn safe-area (tai thỏ), có pull-to-refresh ở màn danh sách.

**Mục tiêu:** hiện đại, tối giản, phân cấp thông tin rõ (số tiền to đậm), thao tác hằng ngày nhanh, cảm giác "app tài chính chuyên nghiệp".

---

## 0.5 ĐỊNH HƯỚNG THẨM MỸ — QUAN TRỌNG NHẤT (đọc kỹ để KHÔNG ra "giao diện AI")

> Mục tiêu: trông như một **app fintech cao cấp do studio thiết kế thật làm ra**, KHÔNG phải template dashboard do AI generate. Tinh tế, có gu, có cá tính, đáng tin.

### Tinh thần thiết kế
"**Sổ quỹ của chủ trọ, chuẩn mực như app ngân hàng số**." Cảm giác: sạch sẽ, tự tin, nhiều khoảng thở, con số là nhân vật chính. Bình tĩnh và chắc chắn — không màu mè, không "vui nhộn".

### Tham chiếu chất lượng (bắt chước tinh thần, không copy)
**Copilot Money, Mercury, Revolut, Monzo, Cash App, Linear, Things 3, Ramp.** Đây là chuẩn "đẹp thật". Trước khi vẽ mỗi màn, tự hỏi: *"Copilot/Mercury có làm nó trông thế này không?"*

### ❌ TUYỆT ĐỐI TRÁNH (đây là các dấu hiệu "giao diện AI")
- **Gradient tràn lan** — không bọc gradient lên mọi thẻ. Gradient chỉ dùng **1 lần/màn** cho đúng 1 con số quan trọng nhất, hoặc không dùng.
- **Glassmorphism / blur / neon / glow / đổ bóng dày.**
- **Emoji làm icon** (⚡💧🏠…) — thay bằng **bộ icon line nét mảnh đồng nhất** (Lucide/Phosphor/SF Symbols style).
- Mọi thứ **card bo tròn + shadow giống hệt nhau**, xếp đều tăm tắp → nhàm, vô hồn.
- **Tím-xanh gradient mặc định**, màu pastel loè loẹt, cầu vồng nhiều màu.
- Badge/pill nhét khắp nơi; chữ nào cũng in đậm cùng cỡ.
- Căn giữa mọi thứ; icon tròn màu mè trước mỗi dòng.
- Nền xám + thẻ trắng + viền + shadow (combo "bootstrap admin").

### ✅ NGUYÊN TẮC ĐỂ ĐẸP THẬT

**1. Typography là linh hồn (quan trọng nhất)**
- Phân cấp mạnh bằng **cỡ + độ đậm**, không bằng màu. Tối thiểu 4 bậc rõ rệt.
- **Con số tiền = ngôi sao**: rất to, đậm (font-black), **tabular-nums** (số thẳng cột), có thể dùng font display riêng cho số. VND rút gọn ở thẻ tóm tắt (12,4tr), đầy đủ ở chi tiết.
- Nhãn phụ: nhỏ, uppercase, letter-spacing rộng, màu xám nhạt.
- Cân nhắc pairing: 1 font display có cá tính cho tiêu đề/số + 1 font sans trung tính cho nội dung.

**2. Màu — kỷ luật, không "gradient soup"**
- Nền chủ yếu **trắng/kem** hoặc **1 tông off-white ấm** (đừng mặc định xám lạnh #F8FAFC — thử nền ấm hơn để bớt "template").
- **Xanh #2563EB là accent DUY NHẤT**, dùng tiết chế (nút chính, 1 điểm nhấn/màn). Teal chỉ để hỗ trợ hiếm hoi.
- Đen/navy #0F172A cho chữ chính. Xám cho phụ. Đỏ/xanh lá **chỉ** cho +/− tiền và cảnh báo thật.
- Bề mặt **phẳng** — phân tách bằng **khoảng trắng và đường kẻ mảnh (hairline)**, không phải bằng shadow.

**3. Không gian & lưới**
- **Rộng rãi, nhiều whitespace** (padding 20–24, khoảng cách khối 24–32). "Trống" là sang.
- Grid dọc chặt chẽ, căn trái nhất quán (số căn phải để so sánh). Optical alignment.

**4. Chiều sâu tối giản**
- Tối đa **1 mức nổi** (shadow rất nhẹ hoặc chỉ viền hairline `#E7E5E0`-ish). Radius **nhất quán 16px** cho card, 12px cho control — đừng trộn nhiều radius.
- Ưu tiên **danh sách có đường kẻ** thay vì "rừng card" cho màn dày dữ liệu (giống app ngân hàng).

**5. Icon & hình**
- 1 bộ icon **line, stroke ~1.5–2px, đồng nhất tuyệt đối**. Không mix filled/outline lung tung. Không emoji.
- Icon phục vụ chức năng, kích thước tiết chế (18–22px), màu theo text chứ không tô màu sặc sỡ.

**6. Cá tính (để không "vô danh")**
- Chọn **1 signature element** làm chữ ký thị giác xuyên suốt: ví dụ dải gradient thương hiệu mảnh làm điểm nhấn ở thẻ số dư chính, hoặc kiểu số display đặc trưng, hoặc header có nhịp riêng.
- Empty state có minh hoạ line tối giản + câu dẫn thân thiện (không sáo rỗng), có CTA rõ.
- Micro-interaction: nhấn nút scale nhẹ, chuyển tab mượt, số đếm lên (count-up) ở dashboard.

**7. Trạng thái tiền bạc rõ ràng**
- Đã thu = xanh lá điềm đạm; Còn nợ/quá hạn = đỏ **chỉ khi thật sự cần**; nháp/chưa gửi = xám. Đừng lạm dụng đỏ.

### Bài kiểm tra cuối mỗi màn
Nếu màn hình trông giống *"một dashboard admin template bất kỳ trên internet"* → **làm lại**. Phải trông giống *"trang trong app ngân hàng số mà mình tin tưởng"*.

---

## 1. Kiến trúc điều hướng

**Auth stack** (chưa đăng nhập): Đăng nhập → Hoàn tất hồ sơ → Chờ duyệt.

**Bottom Tab Bar (7 tab):**
1. 🏠 **Trang chủ** (home) — `home-outline`
2. 🏢 **Phòng** (facilities) — `business-outline` (có nút + tạo nhanh ở giữa)
3. 🧾 **Hóa đơn** (invoices) — mặc định
4. 🔁 **Thu/Chi** (transactions) — `receipt-outline`
5. 📄 **Hợp đồng** (contracts)
6. 📊 **Báo cáo** (reports) — `stats-chart-outline`
7. ⚙️ **Tài khoản** (settings) — `settings-outline`

**Stack phụ** (mở từ tab/settings): tenants, deposit, deposit/new, wallets, trading, services, sepay, profile, feedback, feedback/new, feedback/[id], notifications, audit-logs, invoice/new, invoice/bulk, invoice/[id], payment/new, room/new, room/[id], facility/new, facility/[id], contract/new, contract/[id], contract/[id]/print, transactions/new, transactions/categories.

---

## 2. Chi tiết từng màn hình (KHÔNG SÓT MÀN NÀO)

### A. XÁC THỰC

**A1. Đăng nhập** (`(auth)/login`)
- Logo TrọCare + slogan.
- Nút **Đăng nhập bằng Google** (OAuth).
- Panel bên/hero giới thiệu (badge uy tín, mock dashboard).
- Trạng thái: đang đăng nhập (loading).

**A2. Hoàn tất hồ sơ** (`(auth)/complete-profile`)
- Form: họ tên, SĐT, Tỉnh/Thành phố (picker), Quận/Huyện (picker), địa chỉ.
- Nút **Hoàn tất hồ sơ** → chuyển sang chờ duyệt.

**A3. Chờ duyệt** (`(auth)/pending-approval`)
- Thông báo "Hồ sơ đang chờ duyệt", hướng dẫn liên hệ, nút đăng xuất / tải lại trạng thái.

---

### B. TAB 1 — TRANG CHỦ (`(tabs)/index`)
Dashboard tổng quan chủ trọ:
- **Header**: lời chào + nút chỉnh hồ sơ + avatar.
- **Quick actions (Tác vụ nhanh)**: Hồ sơ, Nhận cọc, Ví (+ có thể: Tạo hóa đơn, Tạo hợp đồng, Lập phiếu thu, Lập phiếu chi, Thu tiền).
- **Thẻ tài chính**: Doanh thu đã thu, Chưa thu, Chi phí vận hành, **Lợi nhuận ròng** (thẻ chính — dùng gradient thương hiệu, số to đậm).
- **Tiền cọc giữ hộ**, **Tài khoản ví** (số dư).
- Danh sách nhanh: Dãy trọ, Khách thuê, Sổ quỹ.
- Empty: "Chưa có hóa đơn nào đã thu", "Chưa phát sinh giao dịch nào".

### C. TAB 2 — PHÒNG / DÃY TRỌ (`(tabs)/facilities`)
- Ô tìm kiếm "Tìm dãy trọ hoặc địa chỉ".
- Banner hướng dẫn "Flow chuẩn: dãy trọ → phòng → hợp đồng → hóa đơn".
- Danh sách **dãy trọ** (card): tên, địa chỉ, số phòng, tỉ lệ lấp đầy, đã thu/còn nợ.
- Nút **+ Thêm dãy trọ** (và nút + nhanh trên tab bar).
- Bấm vào 1 dãy → **Chi tiết dãy** (facility/[id]).

### D. TAB 3 — HÓA ĐƠN (`(tabs)/invoices`)
- **Bộ chọn kỳ** (tháng/năm, ◀ ▶).
- **Filter tabs**: Tất cả / Đã gửi / Đã thanh toán / Quá hạn / Chưa gửi.
- Banner **"Lập hóa đơn hàng loạt"** (hiện số phòng chưa lập) → mở invoice/bulk.
- Banner cảnh báo **hóa đơn quá hạn tháng trước**.
- Danh sách hóa đơn (card): phòng, khách, kỳ, tổng tiền, trạng thái (badge), nút **Thu tiền**.
- Nút **Xuất Excel** (chọn 1/3/6 tháng).
- Bấm hóa đơn → chi tiết (invoice/[id]).

### E. TAB 4 — THU/CHI / SỔ QUỸ (`(tabs)/transactions`)
- Header "Sổ quỹ thu chi".
- **Thẻ tóm tắt**: Tổng thu, Tổng chi, **Số dư** (thẻ chính gradient).
- Lọc theo kỳ + theo ví (walletId param).
- Danh sách giao dịch **nhóm theo ngày**, mỗi dòng: mô tả, ví, danh mục, +thu/−chi (màu).
- Nút **+ Lập phiếu thu chi** → transactions/new.
- Link **Cấu hình danh mục** → transactions/categories.

### F. TAB 5 — HỢP ĐỒNG (`(tabs)/contracts`)
- Danh sách hợp đồng: phòng, khách thuê, kỳ hạn (bắt đầu–hết hạn), giá thuê, trạng thái (đang thuê / sắp hết hạn / đã thanh lý).
- Nút **+ Tạo hợp đồng** → contract/new.
- Bấm → chi tiết hợp đồng (contract/[id]).

### G. TAB 6 — BÁO CÁO (`(tabs)/reports`)
Dashboard phân tích, có 2 tab con:
- **Tài chính & Tiện ích**: biểu đồ dòng tiền 6 tháng (thu/chi), doanh thu điện/nước/wifi, chi phí.
- **Lấp đầy & Công nợ**: tỉ lệ lấp đầy (progress), phòng thuê/trống/bảo trì, **sổ công nợ tồn đọng** (gọi điện trực tiếp cho khách nợ).
- Lọc theo **dãy trọ** (chip). Chọn kỳ: tháng/quý/năm/nhiều năm.

### H. TAB 7 — TÀI KHOẢN (`(tabs)/settings`)
Hub cấu hình, có thẻ hồ sơ + quick action (Hồ sơ, Nhận cọc, Ví). Các nhóm menu:
- **Vận hành phòng trọ**: Khách thuê · Hóa đơn · Lập hóa đơn hàng loạt · Bảng giá dịch vụ · Tiền cọc giữ phòng.
- **Thanh toán & đối soát**: Ví và tài khoản · Kinh doanh hàng hóa · (SePay).
- **Tài khoản**: Báo cáo lỗi/Góp ý · **Đăng xuất**.

---

### I. QUẢN LÝ PHÒNG & DÃY

**I1. Chi tiết dãy trọ** (`facility/[id]`)
- Thống kê: tỉ lệ lấp đầy, đã thu, còn nợ, phòng đang trống.
- Danh sách phòng trong dãy (trạng thái từng phòng).
- Nút **Thêm phòng** → room/new.

**I2. Thêm dãy trọ** (`facility/new`)
- Form: tên dãy (VD "Nhà trọ Phú Quý"), địa chỉ, mô tả.

**I3. Thêm phòng** (`room/new`)
- Chọn dãy áp dụng. Form: tên phòng (VD 101), giá thuê, diện tích (m²), số người tối đa, **trạng thái ban đầu** (trống/bảo trì), **có điều hòa (AC)**.

**I4. Chi tiết phòng** (`room/[id]`)
- Thông tin phòng: diện tích, số người tối đa, trạng thái (trống/bảo trì/đang thuê).
- **Khách thuê hiện tại**: họ tên, CCCD, ngày bắt đầu/hết hạn, tiền cọc.
- **Thông tin hợp đồng** liên kết.

---

### J. KHÁCH THUÊ

**J1. Khách thuê** (`tenants/index`)
- Danh sách khách thuê: tên, liên hệ, phòng, tình trạng thuê.
- **Cập nhật khách thuê** (sửa hồ sơ).
- Empty: "Không tìm thấy khách thuê".

---

### K. HỢP ĐỒNG

**K1. Tạo hợp đồng** (`contract/new`) — form 6 bước:
1. Chọn phòng cho thuê (phòng trống).
2. Thông tin khách thuê (tên, SĐT 10 số, CCCD, quê quán, email).
3. Thiết lập hợp đồng (kỳ hạn: 3 tháng/6 tháng/1 năm/2 năm, giá thuê, tiền cọc, ngày bắt đầu, ngày thu tiền).
4. Chỉ số công tơ ban đầu (điện/nước).
5. Áp dụng dịch vụ tiện ích (chọn từ bảng giá).
6. Ví nhận tiền đặt cọc. + Ghi chú nội bộ.

**K2. Chi tiết hợp đồng** (`contract/[id]`)
- Thông tin khách thuê (CCCD, SĐT, email, quê quán).
- Giá thuê, kỳ hạn (bắt đầu–hết hạn).
- **Dịch vụ tiện ích áp dụng**.
- Danh sách hóa đơn của hợp đồng.
- Nút **Thanh lý hợp đồng** (hoàn cọc/tất toán), **In hợp đồng**.

**K3. In hợp đồng** (`contract/[id]/print`)
- Mẫu hợp đồng chuẩn (Cộng hòa XHCN VN, Bên A/Bên B, trách nhiệm & cam kết).
- Nút **In hợp đồng**, **Chia sẻ qua Zalo/Email**.

---

### L. HÓA ĐƠN & THU TIỀN

**L1. Tạo hóa đơn (đơn lẻ)** (`invoice/new`)
- Chọn hợp đồng. Hiển thị: tiền phòng cố định, dịch vụ cố định, **nợ kỳ trước**.
- Nhập chỉ số điện/nước (tính tiêu thụ × đơn giá).
- **Thêm chi phí khác** (tên + số tiền). Tổng thanh toán.

**L2. Lập hóa đơn hàng loạt** (`invoice/bulk`)
- Điều kiện: phòng Đang thuê + hợp đồng còn hoạt động + kỳ chưa lập.
- Chọn kỳ hóa đơn, lọc theo dãy.
- Bảng từng phòng: nhập chỉ số điện/nước (có OCR chụp đồng hồ), breakdown dịch vụ, **dự tính tổng**.
- Nút **Kiểm tra phòng đủ điều kiện** + **Lập hàng loạt**.

**L3. Chi tiết hóa đơn** (`invoice/[id]`)
- Dạng "THÔNG BÁO TIỀN PHÒNG TRỌ": kính gửi, SĐT, phòng, trạng thái.
- Bảng khoản phí (phòng, điện, nước, wifi, rác...), tổng cộng.
- Phần thanh toán: nợ kỳ trước, phải trả, **mã QR VietQR** + thông tin ngân hàng (ngân hàng, STK, chủ TK, nội dung CK).
- Nút **Chia sẻ hóa đơn (ảnh PNG) qua Zalo/Messenger**, **Thu tiền**, **Xóa hóa đơn**.

**L4. Thu tiền** (`payment/new`)
- Chọn hóa đơn cần thu. Hiển thị tổng/đã thu/còn lại.
- Form: số tiền, **phương thức** (tiền mặt/chuyển khoản/ví điện tử), **ví nhận**, tên người thu, ngày (YYYY-MM-DD), ghi chú.

---

### M. TIỀN CỌC

**M1. Tiền cọc giữ phòng** (`deposit/index`)
- Thẻ **Tổng tiền cọc giữ phòng**. Filter: Tất cả / Đang giữ / Đã chuyển HĐ / Đã hoàn trả / Đã hủy.
- Card mỗi cọc: phòng, khách cọc, số tiền, ngày đặt, ghi chú.
- Actions: **Ký hợp đồng** (chuyển cọc→HĐ), **Hoàn trả**, **Hủy cọc**.

**M2. Nhận cọc giữ phòng** (`deposit/new`)
- Chọn phòng trống, thông tin khách (tên, SĐT), số tiền cọc (gợi ý 1×/2× giá phòng), ngày, ví nhận, ghi chú.

---

### N. TÀI CHÍNH

**N1. Ví & tài khoản** (`wallets/index`)
- Danh sách ví (Cá nhân/Quỹ nhà trọ/Vốn nhập hàng): icon theo loại, **số dư**.
- Khởi tạo nhanh bộ 3 ví mặc định (khi <3 ví).
- Thêm ví (tên + loại), xóa ví. Bấm ví → xem giao dịch của ví.

**N2. Lập phiếu thu chi** (`transactions/new`)
- Toggle **Thu nhập / Chi phí**. Form: số tiền, mô tả, **danh mục** (lọc theo loại), ví, ngày.

**N3. Cấu hình danh mục** (`transactions/categories`)
- Tab Khoản thu / Khoản chi. CRUD danh mục: tên, **emoji**, **màu**, liên kết ví.

**N4. Bảng giá dịch vụ** (`services/index`)
- CRUD dịch vụ (Điện/Nước/Wifi/Rác/phụ phí): tên, **loại tính** (theo số đo / theo người / theo phòng / cố định), đơn giá, giá ML (máy lạnh, tùy chọn), đơn vị.
- Bật/tắt hoạt động từng dịch vụ, sửa, xóa.

**N5. Kinh doanh hàng hóa** (`trading/index`)
- Thu từ bán thêm dịch vụ/vật tư. Danh sách, **lợi nhuận**, nút **Nhập hàng mới**.

---

### O. SEPAY & ĐỐI SOÁT

**O1. Kết nối SePay** (`sepay`)
- **Kênh thanh toán SePay** (cấu hình).
- **Webhook URL đang dùng** (copy/share).
- **Nhật ký webhook gần đây** (danh sách giao dịch nhận từ SePay, trạng thái đối soát, nút thử lại đối soát).
- Empty: "Chưa nhận giao dịch nào từ SePay".

---

### P. TÀI KHOẢN & HỆ THỐNG

**P1. Hồ sơ tài khoản** (`profile/index`)
- Xem/sửa: họ tên, email, SĐT, địa chỉ. Nút lưu / hủy chỉnh sửa.

**P2. Thông báo** (`notifications/index`)
- Danh sách thông báo hệ thống (khách thanh toán, nhắc hạn...), đánh dấu đã đọc.

**P3. Nhật ký thao tác** (`audit-logs/index`)
- Lịch sử hành động trong tài khoản (ai làm gì, khi nào). Pull-to-refresh.

**P4. Báo cáo lỗi & Góp ý** (`feedback/index`)
- Danh sách phản hồi đã gửi, nút **(+) Tạo báo cáo**. Empty: "Chưa có báo cáo nào".

**P5. Tạo báo cáo lỗi mới** (`feedback/new`)
- Phân loại (Báo lỗi / Góp ý), tiêu đề*, mô tả*, mức độ cấp thiết, lĩnh vực/màn hình liên quan, **thêm ảnh**.

**P6. Chi tiết phản hồi** (`feedback/[id]`)
- Nội dung báo cáo + trạng thái xử lý + phản hồi từ admin.

---

## 3. Yêu cầu đầu ra
Với mỗi màn: mockup high-fidelity (light mode), đủ 4 trạng thái, ghi chú component tái sử dụng (Card, thẻ số liệu gradient, badge trạng thái, filter pill, bottom tab, empty state). Đảm bảo **đồng nhất** ngôn ngữ thiết kế xuyên suốt và **không thiếu tính năng nào** ở mục 2.
