# Cài đặt, chạy và deploy

## Cần có

- Node.js 22 (CI dùng bản 22)
- Android Studio + Android SDK nếu build APK; JDK 21

## Biến môi trường

Mỗi app có file mẫu, copy rồi điền giá trị thật. **Không commit file env thật.** Máy phát triển hiện tại có hook (`.git/hooks/pre-commit`, không đi theo repo) chặn commit chứa file `.env` hoặc chuỗi giống key.

| File | Biến quan trọng |
|---|---|
| `backend/.env` (mẫu: `backend/.env.example`) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_ID(S)`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CORS_ORIGINS`, `SEPAY_*` |
| `web-admin/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| `mobile/.env`, `tenant-mobile/.env` (mẫu: `.env.example`) | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |

Lưu ý:
- `JWT_SECRET` còn là khóa mã hóa phiên Zalo đã lưu. Đổi nó thì mọi chủ trọ phải quét lại QR Zalo.
- Ở production backend từ chối khởi động nếu `ADMIN_PASSWORD` để trống hoặc là giá trị mặc định.
- `backend/.env` trên máy đang trỏ vào database production. Chạy local là ghi dữ liệu thật.

## Chạy local

```bash
npm install
npm run local
```

Backend ở `http://localhost:8787`, web chủ trọ ở `http://localhost:3001`. `admin-portal/` không nằm trong workspace, cài và chạy riêng: `npm --prefix admin-portal install && npm --prefix admin-portal run dev`.

## Build APK

```bash
cd mobile/android
EXPO_PUBLIC_API_URL=https://trocare-api.vercel.app ./gradlew assembleRelease
```

File ra ở `mobile/android/app/build/outputs/apk/release/app-release.apk`. Tương tự cho `tenant-mobile/` (cần `npm install` trong thư mục đó trước, vì nó không thuộc workspace gốc). Truyền `EXPO_PUBLIC_API_URL` khi build để không phụ thuộc file `.env` trên máy.

Bản release hiện ký bằng `debug.keystore`. Trước khi đưa lên Google Play cần tạo khóa ký riêng.

## Deploy

Đẩy lên nhánh `main` là Vercel tự build và deploy cả ba project (`trocare-api`, `trocare-production`, `tcare.production`). Sau khi deploy:

```bash
node tools/smoke-test.mjs
```

Migration database không tự chạy, xem [migrations-runbook](../05-database/migrations-runbook.md).

## Dọn dung lượng

Các thư mục sau chỉ là file build, xóa được bất cứ lúc nào và sẽ tự sinh lại ở lần build sau: `*/android/app/build`, `*/android/app/.cxx`, `*/android/.gradle`, `web-admin/.next`, `admin-portal/.next`, `backend/dist`, và `android/build`, `android/.cxx` bên trong `node_modules`.
