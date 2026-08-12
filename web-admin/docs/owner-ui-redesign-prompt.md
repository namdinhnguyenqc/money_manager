# Prompt: Redesign UI chi tiết toàn bộ khu vực Owner (TrọCare web-admin)

Dán nguyên khối trong dấu ``` bên dưới vào Claude (Design/Claude Code) để thực hiện. Prompt
này đã được viết dựa trên khảo sát thật của source code — có địa chỉ file, có nguyên văn các
thông điệp lỗi/thành công hiện có trong app, để bên thực hiện không phải đoán.

---

```
Bạn là design lead + frontend engineer. Redesign UI chi tiết cho toàn bộ khu vực "Owner" của
web-admin TrọCare — app SaaS quản lý nhà trọ cho thuê. Đây là redesign UI thuần tuý: KHÔNG
được đổi logic nghiệp vụ, data fetching, API call, prop, route, tên biến state.

## 0. Stack & tài sản thương hiệu đã có sẵn — dùng lại, không tạo mới
- Next.js 15 (App Router) + React 19 + Tailwind CSS 3 + shadcn/radix-ui + framer-motion.
  Không cài thêm thư viện UI mới ngoài package.json hiện có.
- Logo: web-admin/src/components/ui/Logo.tsx — đã hoàn chỉnh (icon PNG 32x32 tại
  /brand/transparent/trocare-symbol-tc-transparent-256.png + wordmark "Trọ" (đen) + "Care"
  (xanh, text-blue-600) + tagline "QUẢN LÝ TRỌ THÔNG MINH"). KHÔNG sửa file này, KHÔNG tạo
  logo/biến thể logo mới. Chỉ dùng <Logo /> hoặc <Logo collapsed /> ở nơi cần.
- Font: đổi từ 'Be Vietnam Pro' hiện tại sang **Inter** làm font chữ duy nhất cho toàn bộ khu
  vực Owner. Dùng `next/font/google` (Inter đã có sẵn trong Google Fonts, không cần tự host
  file font) — import trong layout gốc liên quan tới owner (hoặc layout chung nếu áp dụng
  toàn app), gán CSS variable (vd `--font-inter`), rồi cập nhật `fontFamily.sans` trong
  `tailwind.config.js` trỏ về Inter thay vì `'Be Vietnam Pro'`. Sau khi đổi, xoá mọi chỗ đang
  hardcode `style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}` (có ít nhất trong
  `web-admin/src/components/ui/Logo.tsx`) — Logo vẫn giữ nguyên bố cục/màu/kích thước, CHỈ đổi
  font chữ phần wordmark "TrọCare" + tagline sang kế thừa `font-sans` chung (Inter) thay vì
  hardcode riêng. Toàn bộ text trong toàn app PHẢI dùng Inter — không được chèn font khác ở bất
  kỳ trang nào (kể cả qua style inline hay import font khác). Đây là yêu cầu "tuân thủ 1 kiểu
  chữ" bắt buộc.
- Màu thương hiệu: primary #2563EB (blue-600), gradient thương hiệu
  linear-gradient(135deg, #2563EB 0%, #06B6D4 100%), navy #0F172A, success #10B981,
  warning #F59E0B, danger #EF4444.

## 1. Design tokens — nguồn sự thật duy nhất
File: web-admin/src/components/ui/design-tokens.ts. Đọc toàn bộ trước khi sửa bất cứ gì:
- `colors`, `buttonVariants` (primary/secondary/outline/ghost/warning/danger/danger-ghost),
  `buttonSizes` (sm/md/lg), `badgeVariants` (primary/success/warning/danger/neutral/orange),
  `inputBase`, `selectBase`, `labelBase`, `cardBase`, `cardHover`,
  `typography` (pageTitle/pageSubtitle/pageDescription/sectionTitle/label/body/caption/
  money/date/phone/idCode), `filterPillActive`/`filterPillInactive`.
Mọi màu/spacing/radius/shadow/typography trong TOÀN BỘ 18 trang phải dùng đúng các token này.
Nếu 1 pattern lặp lại ≥3 nơi mà chưa có token, BỔ SUNG vào design-tokens.ts (không hardcode
riêng trong từng trang, không tạo file token thứ hai).

## 2. Component dùng chung — tái sử dụng, không viết lại
web-admin/src/components/ui/{Badge,Button,Card,DataTable,Input,Logo,PageHeader,Pagination,
Toast}.tsx.

## 3. Chuẩn hoá 1 hệ thống thông báo/lỗi/xác nhận DUY NHẤT cho toàn bộ Owner

Đây là phần quan trọng nhất của redesign này — hiện tại app đang dùng LẪN LỘN 4 kiểu khác
nhau cho cùng một việc, phải gộp về đúng 1 kiểu cho mỗi loại tình huống:

### 3a. Toast thành công / lỗi ngắn (không chặn thao tác)
- Cơ chế chuẩn: `useToast()` từ `web-admin/src/components/ui/Toast.tsx`
  (`showToast(message, "success" | "error" | "info")`) — bubble tròn, đáy màn hình, tự ẩn
  sau 3s, có nút đóng (X). HIỆN CHỈ 5/18 trang dùng đúng cách này (vd `transactions/page.tsx`,
  `boarding-houses/[id]/page.tsx` phần xoá hợp đồng...). CÁC TRANG CÒN LẠI đang tự chế toast
  riêng bằng `useState` cục bộ (vd: biến `toast` set string rồi tự render 1 div tự chế, timeout
  tự viết) — PHẢI đổi hết sang `useToast()` dùng chung, xoá code toast tự chế.
- KHÔNG BAO GIỜ dùng `window.alert(...)` cho thông báo lỗi validate hay kết quả thao tác.
  Đã tìm thấy các chỗ dùng sai cần sửa, ví dụ (nguyên văn tiếng Việt giữ nguyên, chỉ đổi cơ
  chế hiển thị từ `alert()` sang `showToast(..., "error")` hoặc `showToast(..., "success")`):
  - "Chỉ cho phép đính kèm tối đa 5 hình ảnh." (feedback/page.tsx)
  - "Chỉ chấp nhận file hình ảnh." (feedback/page.tsx)
  - "Mỗi hình ảnh có dung lượng tối đa 2MB." (feedback/page.tsx)
  - "Vui lòng nhập đủ tiêu đề và nội dung mô tả." (feedback/page.tsx)
  - "Vui lòng tạo ví trước" (boarding-houses/[id]/page.tsx)
  - "Vui lòng nhập đầy đủ chỉ số và thông tin cho ít nhất 1 phòng có hợp đồng"
    (boarding-houses/[id]/page.tsx)
  - "Tất cả các phòng được chọn đã hoàn tất thanh toán cho kỳ này." (boarding-houses/[id]/page.tsx)
  - "Lỗi khi thêm phòng" (boarding-houses/[id]/page.tsx)
  - Rà toàn bộ `web-admin/src/app/(owner-ops)/owner/**` để tìm hết mọi `alert(...)` còn sót
    (đã xác nhận có trong `settings/page.tsx`, `feedback/page.tsx`,
    `boarding-houses/[id]/page.tsx` — kiểm tra thêm các file khác) và thay hết bằng toast.

### 3b. Banner lỗi tại chỗ (khi 1 khối dữ liệu load thất bại, cần hiển thị + có thể có nút thử lại)
Hiện nhiều trang tự vẽ error banner khác nhau (màu đỏ nhạt, viền đỏ, có nơi có icon có nơi
không). Chuẩn hoá thành 1 component banner dùng chung: nền `bg-red-50`, viền `border-red-200`,
text `text-red-700`, icon `AlertCircle` (lucide-react) bên trái, bo góc theo `cardBase`
(`rounded-xl`), có thể kèm nút "Thử lại" dùng `buttonVariants.outline`. Áp dụng thống nhất cho
mọi nơi hiện đang show `error` state (vd biến `error`/`setError` xuất hiện trong hầu hết các
trang danh sách).

### 3c. Xác nhận hành động phá huỷ (destructive action) — KHÔNG dùng window.confirm nữa
Hiện tại 6+ trang dùng `window.confirm(...)` (popup trình duyệt xấu, không theo design system)
cho các hành động xoá/không thể hoàn tác. Nguyên văn các câu xác nhận cần giữ nguyên nội dung
nhưng chuyển sang dùng component `ConfirmDialog` đã có sẵn tại
`web-admin/src/components/ops/ConfirmDialog.tsx` (modal có overlay, nút Huỷ + nút xác nhận màu
đỏ `buttonVariants.danger`, tiêu đề + mô tả rõ ràng thay vì 1 câu confirm() trần trụi):
  - "Bạn có chắc chắn muốn xoá dịch vụ này?" (services/page.tsx)
  - "Bạn có chắc chắn muốn xoá ví này?" (wallets/page.tsx)
  - "Xóa vĩnh viễn kênh SePay này? Hành động không thể hoàn tác." (settings/page.tsx)
  - "Bạn có chắc chắn muốn xóa hợp đồng này? Thao tác này sẽ giải phóng phòng."
    (boarding-houses/[id]/page.tsx hoặc rental/page.tsx)
  - "Bạn xác nhận lỗi này đã được xử lý xong ổn thỏa và muốn đóng báo cáo?" (feedback/page.tsx)
  - "Xóa giao dịch này? Số dư ví sẽ được điều chỉnh lại." (transactions/page.tsx)
  - "Xác nhận thanh toán {n} hóa đơn bằng ví {tên ví}?" (boarding-houses/[id]/page.tsx — bulk pay)
  - "Bạn có chắc chắn muốn xóa phòng này?" (boarding-houses/[id]/page.tsx)
  - "Bạn có chắc chắn muốn xóa hóa đơn này?" (boarding-houses/[id]/page.tsx)
  - "Bạn có chắc chắn muốn xóa cơ sở này? Thao tác này sẽ xóa toàn bộ phòng thuộc cơ sở."
    (boarding-houses/page.tsx)
  Với mỗi trường hợp: title ngắn gọn (vd "Xoá hợp đồng?"), description = nguyên văn câu hiện
  có, nút xác nhận màu đỏ ghi rõ hành động (vd "Xoá hợp đồng", không ghi chung chung "OK").
  Sau khi rà hết các file trên, tìm thêm mọi `window.confirm(...)` khác còn sót trong
  `web-admin/src/app/(owner-ops)/owner/**` và `web-admin/src/components/owner/**`, `ops/**`
  liên quan tới owner, chuyển hết sang ConfirmDialog.

### 3d. Popup/modal xác nhận thành công cho thao tác lớn (không phải toast ngắn)
Với các hành động có ý nghĩa nghiệp vụ lớn — vd tạo hàng loạt hoá đơn thành công, thanh toán
hàng loạt thành công, hoàn tất tạo hợp đồng — cân nhắc dùng modal xác nhận kết quả (icon
CheckCircle2 màu emerald lớn ở giữa, tiêu đề "Thành công", mô tả ngắn nêu số lượng/kết quả cụ
thể, 1 nút "Đóng" hoặc "Xem chi tiết") thay vì chỉ 1 toast thoáng qua 3 giây — vì đây là hành
động owner cần chắc chắn đã xảy ra đúng. Với hành động nhỏ/thường xuyên (xoá 1 dòng, lưu 1
field) thì toast là đủ, không cần modal.

## 4. Loading & Empty state — chuẩn hoá 1 kiểu duy nhất
- Loading: dùng `web-admin/src/components/ops/LoadingSkeleton.tsx` — pulsing block bám theo
  layout thật của nội dung sắp hiện (không phải khối skeleton chung chung không liên quan tới
  bố cục). KHÔNG dùng text "Đang tải..." trần trụi hoặc chỉ 1 spinner giữa màn hình cho nội
  dung chính của trang (spinner giữa màn hình chỉ chấp nhận được cho auth-check ban đầu của
  toàn shell, đã có sẵn trong OwnerWorkspaceShell.tsx, không đụng vào).
- Empty state: dùng `web-admin/src/components/ops/EmptyState.tsx` — icon lucide-react liên
  quan tới ngữ cảnh (vd Home cho "chưa có phòng nào", Users cho "chưa có khách thuê nào"),
  1 dòng tiêu đề, 1 dòng mô tả ngắn, và nếu hợp lý thì kèm nút hành động chính (vd
  "+ Thêm phòng đầu tiên") dùng `buttonVariants.primary`.

## 5. Typography — tuân thủ nghiêm 1 hệ scale duy nhất
Dùng đúng `typography` export trong design-tokens.ts cho MỌI text, không tự ý chọn cỡ chữ/độ
đậm khác:
- `pageTitle` cho H1 mỗi trang (trong PageHeader).
- `pageSubtitle` cho eyebrow label phía trên title.
- `pageDescription` cho mô tả dưới title.
- `sectionTitle` cho H2 từng khối nội dung trong trang.
- `label` cho nhãn field/cột bảng.
- `body` cho text nội dung thường.
- `caption` cho text phụ, ít quan trọng.
- `money` cho mọi số tiền hiển thị (đảm bảo mọi số tiền trong toàn app có cùng 1 kiểu: đậm,
  không wrap).
- `date`, `phone`, `idCode` cho các loại dữ liệu tương ứng.
Không được dùng cỡ chữ/font-weight tuỳ tiện ngoài scale này ở bất cứ đâu trong 18 trang.

## 6. Trang tham chiếu chuẩn cho layout & shell
- `web-admin/src/app/(owner-ops)/owner/dashboard/page.tsx` — chuẩn cho PageHeader pattern,
  spacing giữa section, cách dùng Card/Button/Badge.
- `web-admin/src/components/owner/OwnerWorkspaceShell.tsx` (sidebar desktop + header +
  dropdown user) và `OwnerBottomNav.tsx` (bottom nav mobile) — đọc kỹ để hiểu spacing/
  breakpoint mọi trang con phải khớp. Không cần sửa nhiều 2 file này, chỉ sửa nếu phát hiện
  bug UI rõ ràng.

## 7. Toàn bộ trang cần redesign chi tiết (17 trang, trong
web-admin/src/app/(owner-ops)/owner/), MỖI trang áp dụng đầy đủ mục 1–5 ở trên:

1. `boarding-houses/page.tsx` — danh sách cơ sở. Có confirm xoá cơ sở (3c), empty state khi
   chưa có cơ sở nào.
2. `boarding-houses/[id]/page.tsx` — chi tiết 1 cơ sở, nhiều tab (Phòng/Chốt điện nước/Hợp
   đồng/Hóa đơn/Thu tiền/Cài đặt). File lớn (~994 dòng) — ưu tiên chuẩn hoá chrome dùng chung
   (PageHeader, tab bar, loading, error banner, toast, confirm dialog cho các hành động
   xoá phòng/hoá đơn/hợp đồng và bulk-pay) trước, rồi mới đi sâu từng tab.
3. `boarding-houses/[id]/rooms/page.tsx` — danh sách phòng của 1 cơ sở.
4. `tenants/page.tsx` — danh sách khách thuê, filter pill theo trạng thái.
5. `tenants/[id]/page.tsx` — chi tiết khách thuê.
6. `rental/page.tsx` — quản lý hợp đồng (contracts), có confirm xoá hợp đồng.
7. `transactions/page.tsx` — sổ thu chi, có confirm xoá giao dịch, modal "Nhanh" (quick add).
8. `transactions/new/page.tsx` — tạo giao dịch mới.
9. `transactions/categories/page.tsx` — quản lý danh mục thu chi.
10. `wallets/page.tsx` — quản lý ví, có confirm xoá ví.
11. `reports/page.tsx` — hiện chỉ redirect sang dashboard, giữ nguyên, không cần redesign.
12. `feedback/page.tsx` — báo cáo lỗi/góp ý, có upload ảnh (giới hạn 5 ảnh, 2MB/ảnh — validate
    này chuyển từ alert() sang toast lỗi), có confirm đóng báo cáo.
13. `notifications/page.tsx` — danh sách thông báo hệ thống.
14. `settings/page.tsx` — trang lớn nhất (~1977 dòng), nhiều tab con (SePay, Zalo, thông báo,
    bảng giá, danh mục, ví). Có confirm xoá kênh SePay. Ưu tiên chuẩn hoá header/tab-switcher/
    loading trước, từng tab sau.
15. `settings/profile/page.tsx` — cài đặt hồ sơ.
16. `profile/page.tsx` — hồ sơ chủ trọ.
17. `audit-logs/page.tsx` — nhật ký thao tác.
18. `services/page.tsx` — quản lý dịch vụ, có confirm xoá dịch vụ.

(Bỏ qua `owner/page.tsx` — 5 dòng redirect, không cần đụng.)

## 8. Responsive
Mobile 375px (chú ý bottom nav che nội dung cuối trang — dùng class `has-bottom-nav` đã có
sẵn nếu trang cần), tablet 768px, desktop 1280px+. Test cả 3 breakpoint cho từng trang.

## 9. Ràng buộc cứng
- KHÔNG đổi logic/data fetching/API call/prop/route/tên biến state.
- KHÔNG dịch hay đổi bất kỳ text tiếng Việt hiển thị cho người dùng — chỉ đổi CƠ CHẾ hiển thị
  (từ alert/window.confirm/toast tự chế → hệ thống chuẩn), giữ nguyên NGUYÊN VĂN nội dung.
- KHÔNG tạo font/logo/màu thương hiệu mới ngoài những gì đã liệt kê ở mục 0.
- KHÔNG cài thêm thư viện UI ngoài package.json hiện có.

## 10. Quy trình bắt buộc
1. Đọc toàn bộ file ở mục 0, 1, 2, 6 trước khi sửa bất cứ trang nào.
2. Redesign theo thứ tự: (a) chuẩn hoá `ConfirmDialog` dùng chung, xác nhận component
   `EmptyState`/`LoadingSkeleton` đã đủ tốt hoặc cần bổ sung; (b) rà và liệt kê toàn bộ
   `alert(...)`, `window.confirm(...)`, toast tự chế trong 18 trang thành 1 danh sách; (c) xử
   lý từng trang theo danh sách mục 7, áp dụng đồng thời cả phần trình bày (token/typography/
   spacing) lẫn phần chuẩn hoá thông báo/lỗi/xác nhận (mục 3–4).
3. Sau khi xong toàn bộ: chạy `cd web-admin && npm run build` — PHẢI pass 0 lỗi, sửa tới khi
   sạch. Chạy `cd web-admin && npm run lint` — sửa lỗi lint liên quan tới các file đã đổi.

## 11. Báo cáo cuối cùng (bắt buộc)
(a) Danh sách file đã sửa. (b) Với mỗi file: tóm tắt thay đổi trình bày + danh sách cụ thể
alert()/window.confirm()/toast tự chế đã được chuyển sang hệ thống chuẩn (giữ nguyên văn nội
dung). (c) Token/component mới đã bổ sung vào design-tokens.ts hoặc ConfirmDialog/EmptyState/
LoadingSkeleton (nếu có) và lý do. (d) Kết quả build/lint cuối cùng. (e) Danh sách
alert()/window.confirm() nếu có sót lại chưa kịp xử lý và lý do. (f) Rủi ro/phần cần người
review kiểm tra kỹ bằng mắt trên trình duyệt trước khi merge — đặc biệt 2 file lớn
(settings/page.tsx, boarding-houses/[id]/page.tsx).
```
