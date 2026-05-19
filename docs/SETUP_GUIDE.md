# Hướng Dẫn Thiết Lập & Khởi Chạy Dự Án TrọCare

Dự án TrọCare sử dụng kiến trúc **Monorepo** bao gồm Frontend (Next.js) và Backend (Hono API) kết nối cơ sở dữ liệu Supabase Cloud.

---

## 🛠 1. Yêu Cầu Hệ Thống

* **Node.js**: Phiên bản 18.x trở lên (Khuyến nghị 20+)
* **NPM** hoặc **Yarn**
* **Supabase Account**: Dùng cho cơ sở dữ liệu Cloud

---

## ⚙️ 2. Thiết Lập Biến Môi Trường (Environment Variables)

### A. Backend (`backend/.env`)
Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Cấu hình Server
API_PORT=8787
NODE_ENV=development

# Thông tin kết nối database Supabase
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Tắt chế độ Mock DB (Dùng DB Supabase thật)
IS_MOCK=false

# Khoá bí mật JWT
JWT_SECRET=change-this-to-a-secure-random-string

# Xác thực Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# CORS cấu hình cho phép Frontend truy cập
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
```

### B. Frontend (`web-admin/.env.local`)
Tạo file `.env.local` trong thư mục `web-admin/` với nội dung:

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
```

---

## 🚀 3. Khởi Chạy Hệ Thống

Dự án hỗ trợ khởi chạy đồng thời cả Frontend và Backend bằng một lệnh duy nhất từ thư mục gốc của dự án.

### Bước 1: Cài đặt dependencies toàn hệ thống
```bash
# Tại thư mục gốc
npm install
```

### Bước 2: Chạy dự án dưới local
```bash
npm run local
```

Lệnh này sẽ khởi chạy:
* **Backend API**: `http://localhost:8787`
* **Frontend Web Admin**: `http://localhost:3001` (hoặc `http://localhost:3000`)

---

## 🔒 4. Cấu Hình CORS & HTTPS Trên Production

Khi deploy lên môi trường Production (như Vercel và Render):
1. Đảm bảo biến `NODE_ENV` được đặt là `production`.
2. Điền chính xác domain Frontend vào biến `CORS_ORIGINS` của Backend để chặn các request trái phép từ bên ngoài.
3. Hono API tự động chặn cache dữ liệu nhạy cảm cho các private routes bằng header `Cache-Control: no-store`.
