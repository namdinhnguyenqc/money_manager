# web-admin/ — Web của CHỦ TRỌ (không phải admin)

> **Đọc kỹ tên thư mục:** thư mục tên `web-admin` nhưng đây là **ứng dụng cho chủ trọ**.
> Cổng admin nội bộ nằm ở [`admin-portal/`](../admin-portal).

Đã có lần cấu hình Vercel bị gắn ngược vì cái tên này: một project dành cho admin
được trỏ vào `web-admin`, và suốt nhiều ngày nó phục vụ app chủ trọ trong khi mọi
người tưởng đang xem admin.

## Thư mục này chứa gì

| Nhóm route | Số trang | Ghi chú |
|---|---|---|
| `(owner-ops)/` | 38 | Phòng, hợp đồng, hóa đơn, thu tiền, khách thuê — phần chính |
| Landing + công khai | 10 | Trang giới thiệu, đăng nhập, tin tức, điều khoản |
| `admin/` | 5 | Vài màn quản trị rút gọn (duyệt tài khoản, phân quyền, phản hồi, cài đặt) |

⚠️ Nhóm `admin/` ở đây **không phải** cổng admin đầy đủ. Nó thiếu quản lý chủ trọ
(`/admin/owners`) và quản lý tài khoản (`/admin/users`) — hai màn đó chỉ có trong
`admin-portal/`. Đây chính là nguồn gốc của nhầm lẫn: mở `/admin` ở đây vẫn thấy
giao diện quản trị nên tưởng đúng, chỉ là thiếu mất một nửa.

## Deploy

| | |
|---|---|
| Vercel project | `trocare-production` |
| URL | https://trocare-production.vercel.app |
| Root Directory | `web-admin` |
| Cấu hình dùng | [`web-admin/vercel.json`](./vercel.json) |

⚠️ **Có một [`vercel.json` ở gốc repo](../vercel.json)** cũng ép build thư mục này.
File đó áp cho mọi project Vercel có Root Directory `.`, và **ghi đè cấu hình trong
dashboard Vercel** — kể cả khi dashboard ghi rõ build app khác. Trước khi đổi bất kỳ
cấu hình deploy nào, đọc file đó trước.

## Chạy local

```bash
npm --prefix web-admin run dev     # cổng 3001
```

## Kiểm tra sau khi deploy

```bash
node tools/smoke-test.mjs owner
```
