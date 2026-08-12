# Prompt Pack: Refactor toàn bộ UI web-admin theo Design System

Bối cảnh dự án (đã khảo sát để các prompt bên dưới bám sát thực tế, không chung chung):

- **Stack**: Next.js 15 (App Router) + React 19 + Tailwind CSS 3 + shadcn/ui (radix-ui) + framer-motion.
- **Token hiện tại**: `tailwind.config.js` mới chỉ có `primary #2563EB`, `navy #0F172A`, `success/danger/warning`, gradient `brand-gradient`, font `Be Vietnam Pro`. Chưa có scale đầy đủ (không có 50–900 shades, không có spacing/radius/shadow scale riêng).
- **UI kit hiện có**: `src/components/ui/` — `Button, Card, Badge, Input, DataTable, Pagination, Toast, PageHeader, Logo, design-tokens.ts`. Đây là nền để mở rộng, không viết lại từ đầu.
- **Các nhóm màn hình cần refactor**:
  - Public/marketing: `src/app/page.tsx` (landing), `login`, `privacy`, `terms`, `not-authorized`, `not-found`, `delete-account`.
  - Onboarding: `complete-profile`, `pending-approval`.
  - Owner-ops (app chính, nhóm route `(owner-ops)`): `owner` (dashboard), `rooms`, `contracts`, `deposits`, `invoices`, `payments`, `facilities`.
  - Admin nội bộ: `admin` (dashboard), `admin/owner-approvals`, `admin/owner-permissions`, `admin/feedback`, `admin/settings`.
  - Tin tức: `tin-tuc`, `tin-tuc/[slug]`, `tin-tuc/danh-muc`, `tin-tuc/tac-gia`, `tin-tuc/tag`.

Dùng các prompt dưới đây **theo đúng thứ tự** (0 → 5). Mỗi prompt tự đứng độc lập — có thể dán thẳng vào Claude Code cho từng phiên làm việc riêng. Không chạy prompt 2 trở đi trước khi prompt 0–1 (token + component base) đã merge, nếu không các trang sẽ tham chiếu token/component chưa tồn tại.

---

## 0. Prompt: Kiểm toán & chốt Design Direction

```
Trước khi refactor UI, hãy đóng vai design lead. Đọc toàn bộ:
- tailwind.config.js
- src/app/globals.css
- src/components/ui/*
- 3-4 trang tiêu biểu: src/app/page.tsx, src/app/(owner-ops)/owner/*, src/app/login/page.tsx, src/app/admin/page.tsx

Xuất ra một bản "Design Audit" ngắn gồm:
1. Danh sách inconsistency hiện tại (màu hardcode ngoài token, spacing tuỳ tiện, font-size không theo scale, radius/shadow không đồng nhất, component trùng lặp tự phát thay vì dùng chung).
2. Đề xuất 1 hướng thiết kế (mood/phong cách) phù hợp cho: (a) app quản lý cho thuê phòng trọ dạng SaaS B2B (owner-ops, admin) — cần rõ ràng, tin cậy, mật độ thông tin cao, giống Linear/Notion/Stripe Dashboard; (b) landing + tin tức — cần thân thiện, dễ đọc, marketing-friendly.
3. Không sửa code ở bước này. Chỉ ra báo cáo để tôi duyệt hướng trước khi đụng vào token.
```

---

## 1. Prompt: Xây Design Token & nền tảng theme (must-do đầu tiên)

```
Refactor design token cho web-admin (Next.js + Tailwind + shadcn/ui), theo hướng SaaS dashboard hiện đại
(tham chiếu chất lượng Linear/Stripe/Notion), giữ tương thích ngược với các class hiện tại (primary, navy,
success, danger, warning) để không phải sửa toàn bộ trang cùng lúc.

Yêu cầu cụ thể:
1. Mở rộng tailwind.config.js:
   - color scale đầy đủ 50-950 cho: primary (giữ hue của #2563EB), neutral/gray (dùng cho nền, text, border),
     success, warning, danger, info. Không đổi giá trị #2563EB gốc, chỉ derive scale quanh nó.
   - spacing scale nhất quán (giữ mặc định Tailwind, chỉ bổ sung token riêng nếu cần cho layout đặc thù:
     sidebar width, header height, content max-width).
   - border-radius scale đặt tên theo semantic: --radius-sm/md/lg/xl/2xl, áp dụng nhất quán (card, button,
     input, modal phải cùng logic bo góc, không mỗi chỗ một kiểu).
   - box-shadow scale semantic: --shadow-xs/sm/md/lg/xl cho card, dropdown, modal, tooltip — theo elevation
     hệ thống rõ ràng, không dùng shadow tuỳ tiện.
   - typography scale: xác nhận/mở rộng cỡ chữ (display, h1-h4, body-lg, body, body-sm, caption) áp map với
     font 'Be Vietnam Pro' hiện có, định nghĩa line-height và font-weight đi kèm từng cấp.
2. Cập nhật src/app/globals.css: khai báo CSS variables tương ứng (light mode trước, chừa chỗ cho dark mode
   sau này nhưng KHÔNG bắt buộc implement dark mode ngay), dọn các rule thừa/trùng lặp đang có trong file
   1791 dòng hiện tại nếu phát hiện dead CSS.
3. Cập nhật/viết lại src/components/ui/design-tokens.ts để export các token này dùng được từ TS (cho biểu đồ,
   inline style nếu cần), đồng bộ 1-1 với Tailwind config, không để hai nguồn sự thật lệch nhau.
4. KHÔNG sửa bất kỳ file trang (page.tsx) nào trong bước này. Chỉ token + globals.css + design-tokens.ts.
5. Chạy `npm run build` sau khi xong để đảm bảo không có lỗi Tailwind/type, dán kết quả build.

Giải thích ngắn gọn các quyết định (vì sao chọn scale này) ở cuối, không cần dài dòng.
```

---

## 2. Prompt: Refactor bộ component dùng chung (`src/components/ui`)

```
Sau khi design token đã chuẩn hoá (tailwind.config.js, globals.css, design-tokens.ts), refactor toàn bộ
src/components/ui/* để dùng token mới một cách nhất quán, và bổ sung các component còn thiếu mà toàn bộ app
đang cần nhưng phải tự chế tạm bợ trong từng trang (kiểm tra bằng cách grep các trang owner-ops/admin để tìm
pattern lặp lại: modal/dialog, dropdown/select, tabs, empty state, skeleton loading, avatar, stat card,
status pill, confirm dialog).

Yêu cầu:
1. Nâng cấp Button, Card, Badge, Input, DataTable, Pagination, Toast, PageHeader theo đúng token elevation/
   radius/spacing mới — đảm bảo mọi variant (primary/secondary/ghost/destructive, size sm/md/lg) nhất quán
   trên toàn bộ.
2. Bổ sung component còn thiếu, ưu tiên theo tần suất dùng: Dialog/Modal, Select/Combobox, Tabs, Skeleton,
   EmptyState, StatCard (số liệu KPI cho dashboard owner/admin), StatusBadge (trạng thái hợp đồng/hoá đơn/
   thanh toán), Avatar, DropdownMenu, Tooltip. Dùng radix-ui (đã có trong deps) làm primitive, style theo
   token vừa tạo — không cài thêm thư viện UI mới ngoài những gì đã có trong package.json.
3. Mỗi component: hỗ trợ đủ state (default/hover/focus/disabled/loading/error) theo đúng token màu, có
   forwardRef nếu cần compose, export type props rõ ràng.
4. Viết 1 trang demo nội bộ tạm thời (ví dụ src/app/dev/ui-kit/page.tsx, không route ra ngoài production/
   không link từ nav) show tất cả component + variant để tôi review nhanh bằng mắt trước khi áp dụng vào
   các trang thật. Sau khi tôi duyệt, tôi sẽ yêu cầu xoá trang demo này.
5. Không đụng vào các trang route chính (owner-ops/admin/...) ở bước này.
6. Chạy build + lint, đảm bảo pass.
```

---

## 3. Prompt: Refactor UI theo từng nhóm màn hình (chạy lặp lại cho mỗi nhóm)

Dùng prompt khung này, đổi phần `<NHÓM MÀN HÌNH>` và `<DANH SÁCH FILE>` cho từng đợt — không refactor toàn bộ app trong 1 lần để dễ review diff và rollback.

```
Refactor UI cho nhóm màn hình: <NHÓM MÀN HÌNH>
File liên quan: <DANH SÁCH FILE>

Bối cảnh: design token (tailwind.config.js, globals.css, design-tokens.ts) và bộ component chung
(src/components/ui/*) đã được chuẩn hoá ở các bước trước — dùng chúng, KHÔNG tạo màu/spacing/shadow hardcode
mới ngoài token, KHÔNG viết lại các component đã có trong src/components/ui (nếu thiếu biến thể thì bổ sung
prop vào component chung, đừng tạo bản sao riêng trong trang).

Yêu cầu:
1. Giữ nguyên toàn bộ logic nghiệp vụ, data fetching, route, prop, API call — chỉ refactor phần trình bày
   (JSX structure có thể đổi để cải thiện layout, nhưng hành vi và dữ liệu hiển thị phải giữ nguyên 100%).
2. Áp dụng layout nhất quán với các nhóm màn hình khác đã refactor trước đó (spacing giữa PageHeader - nội
   dung - action bar, cách bố trí filter/search, khoảng cách card, breakpoint responsive: mobile/tablet/
   desktop).
3. Ưu tiên: information hierarchy rõ ràng (heading/label/value đúng scale), trạng thái rỗng (empty state)
   và trạng thái loading (skeleton) phải có — nếu trang hiện chưa xử lý loading/empty state, bổ sung bằng
   component chung tương ứng.
4. Micro-interaction: dùng framer-motion (đã có trong deps) cho transition nhẹ (fade/slide khi mount, hover
   feedback trên card/button) — có chừng mực, không lạm dụng animation gây rối mắt hoặc chậm thao tác.
5. Kiểm tra responsive thực tế: mô tả rõ hành vi ở 375px (mobile), 768px (tablet), 1280px+ (desktop).
6. Sau khi sửa xong nhóm màn hình này: chạy `npm run build`, dán kết quả; nếu có Browser preview khả dụng,
   mở từng trang trong nhóm, chụp screenshot, xác nhận không có lỗi console/network trước khi báo hoàn thành.
7. Liệt kê rõ những gì đã đổi (trước/sau) theo từng file trong phần tóm tắt cuối cùng.
```

### Thứ tự nhóm màn hình đề xuất (từ rủi ro thấp → cao, và theo mức độ dùng nhiều)

1. `Public/marketing` — landing (`src/app/page.tsx`, `LandingPageClient.tsx`), `login`, `privacy`, `terms`, `not-authorized`, `not-found`, `delete-account`.
2. `Onboarding` — `complete-profile`, `pending-approval` (vừa sửa bug điều hướng, refactor UI xong nhớ test lại luồng auto-approve).
3. `Owner-ops core` — `owner` (dashboard, đã redesign gần đây theo commit `a3ea49f`, kiểm tra không refactor chồng chéo/giật lùi), `rooms`, `contracts`.
4. `Owner-ops tài chính` — `deposits`, `invoices`, `payments`.
5. `Owner-ops vận hành` — `facilities`.
6. `Admin nội bộ` — `admin` (dashboard), `owner-approvals`, `owner-permissions`, `feedback`, `settings`.
7. `Tin tức` — `tin-tuc` và các sub-route (`[slug]`, `danh-muc`, `tac-gia`, `tag`) — cần tối ưu đọc (typography, line-length, ảnh) hơn là mật độ dữ liệu.

---

## 4. Prompt: Điều hướng, Sidebar/Nav toàn cục & Responsive shell

```
Refactor shared shell (layout) của owner-ops và admin: src/app/(owner-ops)/layout.tsx, src/app/admin/layout.tsx,
và mọi component nav/sidebar dùng trong đó.

Yêu cầu:
1. Thống nhất 1 pattern shell cho owner-ops và admin (có thể khác nhau về menu item nhưng cùng 1 hệ khung:
   sidebar width, header height, breadcrumb/PageHeader, spacing content area) dùng token đã chuẩn hoá.
2. Sidebar: responsive — thu gọn thành icon-only hoặc drawer trên tablet/mobile, có active state rõ ràng,
   nhóm menu item theo section nếu số lượng nhiều (rooms/contracts/deposits/invoices/payments/facilities).
3. Header: hiển thị breadcrumb/tên trang hiện tại (PageHeader component), user menu (avatar + dropdown:
   thông tin, đăng xuất), không phá vỡ logic auth hiện có trong AuthContext/hooks — chỉ refactor phần trình bày.
4. Đảm bảo z-index, scroll behavior (sidebar sticky, content scroll riêng nếu cần) hoạt động đúng trên các
   trang có bảng dữ liệu dài (DataTable).
5. Build + kiểm tra bằng Browser preview trên cả 3 breakpoint, screenshot xác nhận.
```

---

## 5. Prompt: QA & Regression Checklist sau refactor toàn bộ

```
Sau khi tất cả nhóm màn hình đã refactor xong, chạy kiểm tra toàn diện trước khi coi là hoàn tất:

1. `npm run build` và `npm run lint` — 0 lỗi.
2. Grep toàn bộ src/app và src/components để đảm bảo không còn màu hex hardcode ngoài token
   (trừ nơi cố ý, ví dụ brand-gradient), không còn box-shadow/border-radius tuỳ tiện ngoài scale đã định nghĩa.
3. Duyệt qua từng nhóm route đã refactor bằng Browser preview, với tài khoản demo/thực tế nếu có, xác nhận:
   - Không có lỗi console/network.
   - Toàn bộ luồng nghiệp vụ chính vẫn hoạt động đúng (KHÔNG chỉ đẹp mà còn đúng chức năng): đăng nhập,
     complete-profile → auto-approve/pending-approval, tạo/sửa phòng, hợp đồng, cọc, hoá đơn, thanh toán,
     duyệt owner ở admin.
   - Responsive OK ở 375/768/1280.
4. So sánh trước/sau bằng screenshot cho ít nhất mỗi nhóm màn hình 1 cặp before/after, tổng hợp thành báo cáo.
5. Dọn dẹp: xoá trang demo ui-kit tạm (nếu còn), xoá code/CSS chết phát hiện trong quá trình refactor.
6. Liệt kê rõ risk còn tồn đọng (nếu có phần nào chưa kịp refactor hoặc cần theo dõi thêm sau khi lên prod).
```

---

## Lưu ý khi vận hành prompt pack này

- **Không gộp prompt 0–5 vào 1 lần chạy.** Mỗi prompt nên là 1 phiên Claude Code riêng (hoặc ít nhất 1 lượt review/duyệt của bạn giữa các bước), vì đây là refactor UI toàn bộ web — rủi ro lớn nếu không review từng phần.
- **Prompt 3 dùng khung lặp lại** — bạn điền nhóm màn hình + file cụ thể mỗi lần, để tránh 1 lần đổi quá nhiều diff không review nổi.
- Không có sẵn thư viện thiết kế (Figma) trong repo — các prompt trên tự mô tả hướng thiết kế bằng ngôn ngữ (SaaS dashboard hiện đại kiểu Linear/Stripe/Notion). Nếu bạn có Figma/reference ảnh cụ thể, nên đính kèm ảnh vào prompt 0 để Claude bám sát hơn thay vì tự suy diễn.
