# admin-portal/ — Cổng ADMIN nội bộ

> Đây mới là ứng dụng admin thật. Thư mục [`web-admin/`](../web-admin) — dù tên như vậy —
> là **web của chủ trọ**.

## Thư mục này chứa gì

21 trang, gồm những màn **không tồn tại ở đâu khác**:

| Route | Chức năng |
|---|---|
| `/admin/owners`, `/admin/owners/[id]` | **Quản lý chủ trọ** |
| `/admin/users`, `/admin/users/[id]` | **Quản lý tài khoản** |
| `/admin/tenants/[id]`, `/admin/rooms/[id]` | Tra cứu khách thuê, phòng |
| `/admin/articles` + authors, categories | CMS tin tức |
| `/admin/owner-approvals`, `/admin/owner-permissions` | Duyệt & phân quyền chủ trọ |
| `/admin/feedback`, `/admin/settings` | Phản hồi, cài đặt hệ thống |
| `/super-admin`, `/super-admin/users`, `/super-admin/reports` | Super admin |

`/` không có landing page — nó `redirect("/admin")`. Nếu mở trang gốc mà thấy trang
giới thiệu sản phẩm thì **đang chạy nhầm app** (xem mục Deploy bên dưới).

## Deploy

| | |
|---|---|
| Vercel project | `tcare.production` |
| URL | https://tcareproduction.vercel.app |
| Root Directory | **phải là `admin-portal`** |
| Cấu hình dùng | [`admin-portal/vercel.json`](./vercel.json) |

### ⚠️ Cái bẫy đã từng làm hỏng cổng này

[`vercel.json` ở gốc repo](../vercel.json) ghi:

```json
"buildCommand": "npm --prefix web-admin run build"
```

File này áp cho **mọi project có Root Directory `.`** và **thắng cấu hình dashboard**.
Nên dù dashboard ghi `npm --prefix admin-portal run build`, Vercel vẫn build web chủ trọ.
Triệu chứng: `/admin` vẫn mở được (vì `web-admin/` cũng có vài màn admin) nhưng
`/admin/owners` và `/admin/users` trả 404.

**Cách tránh:** giữ Root Directory = `admin-portal`. Khi đó `vercel.json` gốc nằm ngoài
phạm vi deploy nên không còn tác dụng.

## Không phải npm workspace

Thư mục này **cố ý** đứng ngoài `workspaces` ở `package.json` gốc: nó giữ
`package-lock.json` riêng và Vercel deploy nó độc lập.

Hệ quả: các lệnh `npm run lint/typecheck/test --workspaces` ở gốc **bỏ qua** thư mục này.
CI vì thế có bước cài/kiểm tra/build riêng cho nó — nếu không, app này có thể hỏng hoàn
toàn mà CI vẫn xanh (đã từng xảy ra).

## Chạy local

```bash
npm --prefix admin-portal run dev    # cổng 3011
```

## Kiểm tra sau khi deploy

```bash
node tools/smoke-test.mjs admin
```
