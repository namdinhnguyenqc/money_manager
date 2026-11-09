---
name: repo-hygiene
description: Giữ repo money_manager gọn, không để node_modules, file build và cache phình lên hàng GB. Dùng mỗi khi build APK (Gradle), build web (Next.js), chạy npm install, cài thư viện cho tenant-mobile hoặc admin-portal, dọn dung lượng, hoặc trước khi kết thúc một phiên làm việc có build.
---

# Giữ repo gọn

Code thật của repo chỉ khoảng 50 MB. Repo từng phình lên 8 GB rồi 2,6 GB, toàn bộ là file tự sinh ra khi cài và build. Các quy tắc dưới đây để không lặp lại chuyện đó.

## Nguồn phình to (đã đo thực tế)

| Nguồn | Dung lượng từng gặp | Sinh ra khi |
|---|---|---|
| `node_modules/*/android/build`, `.cxx` (reanimated, expo-modules-core, worklets…) | ~4,4 GB | Mỗi lần `./gradlew assembleRelease` |
| `mobile/android/app/build`, `.cxx`, `android/.gradle` | ~1,9 GB | Build APK |
| `node_modules` gốc + `tenant-mobile/node_modules` + `admin-portal/node_modules` | ~1,9 GB khi cài sạch | `npm install` (ba bộ cài trùng nhau) |
| `web-admin/.next/cache` | ~370 MB | Mỗi lần `npm run build` / `dev` của web |

## Quy tắc bắt buộc

1. **Build APK xong thì dọn ngay.** Chép file `.apk` ra ngoài repo trước (ví dụ `~/Downloads/`), rồi chạy:
   ```bash
   npm run clean
   ```
   Lệnh này xóa build Android, phần Gradle biên dịch vào trong `node_modules`, `.next`, `backend/dist`. Không cần cài lại gì.
2. **Không cài thư viện cho `tenant-mobile/` hay `admin-portal/` nếu không thật sự build/chạy app đó.** Hai thư mục này không thuộc workspace gốc, cài vào là thêm một bản React Native/Expo hoặc Next.js nữa (300 MB–1,6 GB). Cài để build một lần thì build xong xóa `node_modules` của chính thư mục đó.
3. **Kiểm tra web, typecheck, test xong thì không để lại server hay cache.** Dừng dev server (`preview_stop`), và nếu đã chạy `npm run build` của web thì chạy `npm run clean` trước khi kết thúc.
4. **Không bao giờ commit file sinh ra:** `node_modules/`, `.next/`, `dist/`, `android/app/build/`, `.cxx/`, `.gradle/`, `*.apk`, file dump database. Đã có trong `.gitignore`; trước khi commit kiểm tra `git diff --cached --name-only`.
5. **Không xóa thứ không tự sinh lại được.** Chỉ dọn danh sách ở trên. Không đụng file env (`.env`, `.env.local`), `scratch/`, file chưa commit của người dùng, hay thư mục ngoài repo (cache Gradle trong `~/.gradle`).

## Lệnh

```bash
npm run clean       # dọn build + cache, giữ node_modules (dùng thường xuyên)
npm run clean:all   # dọn thêm toàn bộ node_modules, về ~155 MB; phải npm install lại trước khi làm việc
du -sh .            # kiểm tra dung lượng repo
```

Script nằm ở `tools/clean.mjs`. Thêm thư mục build mới vào đó nếu có app hoặc công cụ mới sinh ra file build.

## Khi kết thúc phiên có build

Báo cho người dùng dung lượng repo (`du -sh .`). Nếu vượt khoảng 500 MB mà không có lý do (ví dụ đang cần `node_modules` để chạy local), chạy `npm run clean` rồi báo lại.
