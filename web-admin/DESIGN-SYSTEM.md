# Design system — web chủ trọ

Bộ chuẩn giao diện. Mọi màn hình phải tuân theo.

> Tokens đã tồn tại từ trước nhưng **216 nút vẫn viết tay** — vì có chuẩn mà không có
> cưỡng chế thì chuẩn bị bỏ qua. Nên tài liệu này đi kèm lint rule trong
> `.eslintrc.json`, hiện đang cảnh báo **135 chỗ**.

## Nút

Luôn dùng [`<Button>`](./src/components/ui/Button.tsx). Không tự viết class nút.

```tsx
import Button from "@/components/ui/Button";

<Button variant="primary" icon={<Plus size={16} />}>Thêm phòng</Button>
<Button href="/rooms/new" variant="primary">Thêm phòng</Button>   {/* điều hướng */}
<Button variant="outline" size="sm">Sửa</Button>
<Button variant="danger" loading={saving}>Xoá</Button>
```

### Size — chiều cao cố định

| Size | Cao | Dùng khi |
|---|---|---|
| `sm` | 32px | Nút trong bảng, trong thẻ, hành động phụ |
| `md` | 40px | **Mặc định** — thanh công cụ, form |
| `lg` | 48px | CTA chính, nút submit trong dialog |

Chiều cao cố định là lý do một hàng nút thẳng hàng dù trộn nhiều variant. Đừng
đắp thêm `py-*` hay `h-*` vào `className`.

### Variant

| Variant | Dùng khi |
|---|---|
| `primary` | Hành động chính của màn hình. **Mỗi màn chỉ một** |
| `outline` | Hành động phụ đứng cạnh primary |
| `ghost` | Hành động nhẹ: quay lại, đóng, chuyển chế độ xem |
| `danger` | Xoá, huỷ, thao tác không hoàn tác được |
| `secondary` / `warning` / `danger-ghost` | Trường hợp riêng, cân nhắc trước khi dùng |

### Điều hướng

Nút dẫn sang trang khác là `<Button href="...">`, **không** phải `<Link>` bọc
`<Button>` và cũng không phải `<Link>` tự đắp class. Đây chính là chỗ khiến
"Thêm phòng mới" và "← Tất cả phòng" lệch chiều cao dù nằm cạnh nhau.

Ngoại lệ duy nhất: component bên thứ ba chỉ nhận `className` — khi đó dùng
`buttonClasses(variant, size)`.

## Nhãn và chữ

- Nhãn thẻ số: **viết thường** — `Tổng hóa đơn`, không phải `TỔNG HÓA ĐƠN`.
  Dashboard đang in hoa còn Hoá đơn viết thường, cùng một loại component.
- Tiêu đề trang: `text-xl font-bold` (desktop `sm:text-[22px]`)
- Tiền: luôn qua `formatMoney()`, **không bao giờ cắt cụt bằng `truncate`** —
  trong app quản lý tiền, con số là thứ duy nhất không được phép bị ẩn.

## Bộ lọc

Vấn đề lớn nhất hiện tại: bộ lọc chiếm nhiều diện tích hơn dữ liệu nó lọc.
Trang Phòng từng có **4 hàng điều khiển cho 2 phòng**.

Quy tắc:

1. **Ẩn bộ lọc không làm được gì.** Ô lọc dãy chỉ hiện khi cơ sở có ≥2 dãy.
   Chip trạng thái ra 0 kết quả thì ẩn.
2. **Gom lọc cùng loại về một hàng.** Cơ sở và Dãy đều là lọc phạm vi — đừng
   tách hai hàng, một ở mép trái một ở mép phải.
3. **Tối đa 2 hàng.** Nhiều hơn thì đẩy phần còn lại vào nút "Bộ lọc".
4. **Không lặp ngữ cảnh đã biết.** Đang lọc cơ sở "123" thì tiêu đề nhóm không
   cần ghi lại "123 · ..." ở từng nhóm.

## Dialog

- Xác nhận thao tác không hoàn tác được: [`ConfirmDialog`](./src/components/ops/ConfirmDialog.tsx).
  **Không dùng** `window.confirm` — nó là popup của trình duyệt, lạc khỏi thiết kế.
- Báo lỗi/thành công: `useToast()`. **Không dùng** `alert()` — nó chặn JS và
  không hiện được trong một số ngữ cảnh modal.
- Nút trong dialog: `Hủy` (`outline`) bên trái, hành động chính (`primary` hoặc
  `danger`) bên phải.

## Mobile

- Kiểm ở **375px**, không chỉ desktop.
- Thẻ số xếp 2 cột ở 375px chỉ còn ~120px cho chữ — dùng `text-base sm:text-xl`
  để số tiền không bị cắt.
- Nội dung chính phải thấy được **không quá 2 lần cuộn** từ đầu trang.

## Khi thêm màn hình mới

1. Nút → `<Button>`
2. Xác nhận → `ConfirmDialog`; thông báo → `useToast()`
3. Bộ lọc → tối đa 2 hàng, ẩn cái vô dụng
4. Chạy `npm run lint` — không được thêm cảnh báo mới
5. Kiểm ở 375px trước khi xong

## Migrate phần cũ

135 chỗ đang vi phạm. Chuyển **theo từng màn hình**, không theo từng nút — để app
luôn nhất quán trong phạm vi một màn và rollback được từng phần.

Thứ tự theo tần suất dùng: **Phòng → Hoá đơn → Cơ sở → Hợp đồng → Dashboard**.

Xong một màn thì commit riêng màn đó, kèm số cảnh báo lint giảm được.
