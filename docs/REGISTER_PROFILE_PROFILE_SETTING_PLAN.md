# Kế hoạch triển khai Register, Profile, Profile Setting

## 1. Mục tiêu

Xây dựng lại luồng đăng ký/đăng nhập bằng Google và hồ sơ người dùng cho hệ thống chủ nhà.

Yêu cầu chính:

- User đăng ký bằng Google hoặc email confirm.
- Email được kế thừa từ tài khoản đã xác thực.
- Email không được chỉnh sửa trong Profile hoặc Profile Setting.
- User mới bắt buộc phải điền thông tin hồ sơ trước khi vào màn hình chính.
- Thông tin hồ sơ sau khi điền sẽ hiển thị ở Profile.
- User có thể chỉnh sửa thông tin trong Profile Setting, trừ email.
- Tách rõ trách nhiệm FE và BE cho 3 nhóm tính năng: Register, Profile, Profile Setting.

## 2. Scope tính năng

### 2.1 Register

Register sẽ xử lý:

- Google Register/Login.
- Email confirm Register/Login nếu hệ thống đang có.
- Check user tồn tại hay chưa.
- Nếu user đã tồn tại và đã hoàn tất profile thì cho vào dashboard.
- Nếu user mới hoặc chưa hoàn tất profile thì điều hướng sang Complete Profile.

### 2.2 Profile

Profile dùng để hiển thị thông tin cá nhân/chủ nhà sau khi hoàn tất đăng ký.

Hiển thị:

- Email
- Họ tên
- Số điện thoại
- Tỉnh / Thành phố
- Quận / Huyện
- Địa chỉ chi tiết
- Địa chỉ đầy đủ
- Avatar nếu có
- Role
- Provider đăng nhập

### 2.3 Profile Setting

Profile Setting dùng để chỉnh sửa thông tin hồ sơ.

Cho phép chỉnh:

- Họ tên
- Số điện thoại
- Tỉnh / Thành phố
- Quận / Huyện
- Địa chỉ chi tiết
- Avatar nếu có

Không cho chỉnh:

- Email
- Role
- Provider đăng nhập

## 3. Luồng nghiệp vụ tổng thể

```text
User bấm Continue with Google
        ↓
FE/Mobile lấy Google token
        ↓
FE/Mobile gửi token lên BE
        ↓
BE verify Google token
        ↓
BE lấy email, name, avatar từ Google
        ↓
BE check user theo email hoặc google_id
        ↓
Nếu user đã tồn tại:
    Login thành công
    Check is_profile_completed
        ↓
        Nếu true:
            Trả nextStep = DASHBOARD
        Nếu false:
            Trả nextStep = COMPLETE_PROFILE
        ↓
Nếu user chưa tồn tại:
    Tạo user mới
    role = OWNER
    auth_provider = google
    is_profile_completed = false
    onboarding_step = COMPLETE_PROFILE
    Trả nextStep = COMPLETE_PROFILE
        ↓
FE điều hướng sang Complete Profile
        ↓
User nhập bắt buộc:
    - Họ tên
    - Số điện thoại
    - Tỉnh / Thành phố
    - Quận / Huyện
    - Địa chỉ chi tiết
        ↓
BE lưu user_profiles
BE update users.is_profile_completed = true
BE update users.onboarding_step = DONE
        ↓
FE điều hướng vào Dashboard
```

## 4. Quy tắc bắt buộc

### 4.1 User chưa hoàn tất profile

Nếu `is_profile_completed = false`, user không được vào dashboard chính.

FE phải chặn route. BE cũng phải chặn các API nghiệp vụ chính.

Các màn/API được phép dùng khi chưa hoàn tất profile:

- Complete Profile page
- `GET /me/profile`
- `POST /me/profile/complete`
- `PUT /me/profile`
- `GET /locations/provinces`
- `GET /locations/districts`
- Logout

Các màn/API không được dùng khi chưa hoàn tất profile:

- Dashboard
- Rooms
- Tenants
- Contracts
- Invoices
- Wallets
- Transactions
- Rental Services
- Bookings
- Trading

### 4.2 Email readonly

Email được lấy từ:

- Google email sau khi verify token.
- Email đã confirm nếu register bằng email/password.

Email không được sửa trong Complete Profile, Profile, Profile Setting.

Nếu sau này muốn đổi email, cần làm một flow riêng:

```text
Change email → gửi email confirm mới → user verify → update email
```

## 5. Data model đề xuất

### 5.1 Bảng users

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OWNER',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'COMPLETE_PROFILE',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
```

| Field | Mô tả |
|---|---|
| `email` | Email đăng nhập, đã xác thực |
| `name` | Tên hiển thị, đồng bộ từ profile |
| `avatar_url` | Avatar từ Google hoặc upload |
| `role` | Mặc định `OWNER` |
| `status` | `active`, `blocked`, `deleted` |
| `auth_provider` | `google`, `email` |
| `email_verified_at` | Thời điểm xác thực email |
| `is_profile_completed` | User đã hoàn tất profile hay chưa |
| `onboarding_step` | Bước onboarding hiện tại |
| `last_login_at` | Lần đăng nhập gần nhất |

### 5.2 Bảng user_profiles

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,

  province_code TEXT NOT NULL,
  province_name TEXT NOT NULL,

  district_code TEXT NOT NULL,
  district_name TEXT NOT NULL,

  address_line TEXT NOT NULL,
  full_address TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Nếu hệ thống hiện tại không dùng UUID, đổi `UUID` theo type của `users.id`.

### 5.3 Bảng social_accounts nếu chưa có

```sql
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  provider_email_verified BOOLEAN DEFAULT FALSE,
  provider_name TEXT,
  provider_avatar_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(provider, provider_user_id)
);
```

Google `sub` phải lưu vào `provider_user_id`. Không nên dùng email làm định danh duy nhất cho Google account.

## 6. BE plan

### 6.1 Module Register

#### API: Google Auth

```http
POST /auth/google
```

Request từ Web:

```json
{
  "idToken": "GOOGLE_ID_TOKEN",
  "platform": "web"
}
```

Request từ Mobile:

```json
{
  "idToken": "GOOGLE_ID_TOKEN",
  "platform": "ios",
  "deviceId": "optional-device-id",
  "fcmToken": "optional-fcm-token"
}
```

BE xử lý:

1. Verify Google ID Token.
2. Validate token audience/client_id.
3. Validate `email_verified = true`.
4. Lấy `sub`, `email`, `name`, `picture`.
5. Check `social_accounts` theo provider `google` và Google `sub`.
6. Nếu có social account: load user, check status, update `last_login_at`, issue token, load profile, return `logged_in`.
7. Nếu chưa có social account: check `users.email`.
8. Nếu user email đã tồn tại: link Google account vào user, update `auth_provider` nếu phù hợp, issue token, load profile, return `linked_and_logged_in`.
9. Nếu user chưa tồn tại: create user mới với `role = OWNER`, `status = active`, `auth_provider = google`, `email_verified_at = now`, `is_profile_completed = false`, `onboarding_step = COMPLETE_PROFILE`; create social account; issue token; return `registered`.
10. Tính `nextStep`: nếu chưa completed profile thì `COMPLETE_PROFILE`, nếu completed thì `DASHBOARD`.

Response user mới:

```json
{
  "success": true,
  "action": "registered",
  "accessToken": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "user_123",
    "email": "owner@gmail.com",
    "name": "Nguyễn Văn A",
    "avatarUrl": "https://...",
    "role": "OWNER",
    "authProvider": "google",
    "isProfileCompleted": false,
    "onboardingStep": "COMPLETE_PROFILE"
  },
  "profile": null,
  "nextStep": "COMPLETE_PROFILE"
}
```

Response user cũ đã đủ profile:

```json
{
  "success": true,
  "action": "logged_in",
  "accessToken": "ACCESS_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "user_123",
    "email": "owner@gmail.com",
    "name": "Nguyễn Văn A",
    "avatarUrl": "https://...",
    "role": "OWNER",
    "authProvider": "google",
    "isProfileCompleted": true,
    "onboardingStep": "DONE"
  },
  "profile": {
    "fullName": "Nguyễn Văn A",
    "phone": "0901234567",
    "provinceCode": "79",
    "provinceName": "TP. Hồ Chí Minh",
    "districtCode": "760",
    "districtName": "Quận 1",
    "addressLine": "123 Nguyễn Huệ",
    "fullAddress": "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
  },
  "nextStep": "DASHBOARD"
}
```

### 6.2 Module Complete Profile

#### API: Get current profile

```http
GET /me/profile
```

Auth: required.

Response khi chưa có profile:

```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "owner@gmail.com",
    "name": "Nguyễn Văn A",
    "avatarUrl": "https://...",
    "role": "OWNER",
    "authProvider": "google",
    "isProfileCompleted": false,
    "onboardingStep": "COMPLETE_PROFILE"
  },
  "profile": null
}
```

#### API: Complete profile

```http
POST /me/profile/complete
```

Auth: required.

Request:

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "provinceCode": "79",
  "provinceName": "TP. Hồ Chí Minh",
  "districtCode": "760",
  "districtName": "Quận 1",
  "addressLine": "123 Nguyễn Huệ"
}
```

Required fields:

| Field | Rule |
|---|---|
| `fullName` | Required, min length 2 |
| `phone` | Required, Vietnamese phone format |
| `provinceCode` | Required |
| `provinceName` | Required |
| `districtCode` | Required |
| `districtName` | Required |
| `addressLine` | Required, min length 5 |

BE xử lý:

1. Check auth user.
2. Validate required fields.
3. Normalize phone.
4. Build `fullAddress = addressLine, districtName, provinceName`.
5. Upsert `user_profiles`.
6. Update `users.name = fullName`.
7. Update `users.is_profile_completed = true`.
8. Update `users.onboarding_step = DONE`.
9. Return profile.

### 6.3 Module Profile Setting

#### API: Update profile

```http
PUT /me/profile
```

Auth: required.

BE rule:

- Không nhận update email.
- Nếu FE gửi email thì bỏ qua.
- Không nhận update role.
- Không nhận update authProvider.
- Validate các field giống Complete Profile.
- Nếu update thành công thì `is_profile_completed` vẫn là true.

### 6.4 Location API

```http
GET /locations/provinces
GET /locations/districts?provinceCode=79
```

Nếu chưa muốn làm location API, FE có thể dùng JSON tỉnh/huyện local, nhưng BE vẫn phải validate không được nhận field rỗng.

### 6.5 Middleware chặn user chưa hoàn tất profile

```ts
function requireCompletedProfile(req, res, next) {
  if (!req.user.is_profile_completed) {
    return res.status(403).json({
      success: false,
      code: "PROFILE_REQUIRED",
      message: "Vui lòng hoàn tất hồ sơ trước khi sử dụng hệ thống.",
      nextStep: "COMPLETE_PROFILE"
    })
  }

  next()
}
```

Áp dụng cho route nghiệp vụ:

- `/rental/rooms`
- `/rental/tenants`
- `/rental/contracts`
- `/rental/invoices`
- `/rental/services`
- `/wallets`
- `/transactions`
- `/owner/bookings`
- `/owner/messages`
- `/owner/trading`

Không áp dụng cho:

- `/auth/google`
- `/auth/logout`
- `/me/profile`
- `/me/profile/complete`
- `/locations/provinces`
- `/locations/districts`

### 6.6 BE files dự kiến cần thay đổi

| File | Việc cần làm |
|---|---|
| `money-manager-mobile/backend/src/routes/auth.ts` | Sửa Google auth, trả `nextStep`, tạo user mới nếu chưa tồn tại |
| `money-manager-mobile/backend/src/routes/profile.ts` | Tạo route mới cho `GET /me/profile`, `POST /me/profile/complete`, `PUT /me/profile` |
| `money-manager-mobile/backend/src/routes/locations.ts` | Tạo route tỉnh/huyện nếu dùng BE location API |
| `money-manager-mobile/backend/src/middleware/auth.ts` | Đảm bảo auth middleware attach `req.user` |
| `money-manager-mobile/backend/src/middleware/requireCompletedProfile.ts` | Thêm middleware chặn user chưa hoàn tất profile |
| `money-manager-mobile/backend/src/routes/rental.ts` | Gắn middleware profile completed cho các route nghiệp vụ |
| `money-manager-mobile/backend/src/db/*` hoặc mock memory file | Thêm user_profiles, social_accounts nếu chưa có |
| `money-manager-mobile/backend/src/types/*` | Thêm type UserProfile, OnboardingStep |
| `money-manager-mobile/backend/src/server.ts` hoặc `app.ts` | Mount profile/location routes |

## 7. FE plan

### 7.1 Module Register

FE cần:

1. Giữ nút Google login/register hiện tại.
2. Sau khi lấy Google token, gọi `POST /auth/google`.
3. Nhận response có `nextStep`.
4. Điều hướng:

```ts
if (response.nextStep === "COMPLETE_PROFILE") {
  router.push("/complete-profile")
} else {
  router.push("/owner")
}
```

Rule quan trọng: không được cho user vào dashboard chỉ vì login Google thành công. Phải check `user.isProfileCompleted` hoặc `response.nextStep`.

### 7.2 Module Complete Profile

Route khuyến nghị:

```text
/complete-profile
```

Form gồm:

| Field | Component | Rule |
|---|---|---|
| Email | Input disabled | Readonly từ user.email |
| Họ tên | Text input | Required |
| Số điện thoại | Text input | Required, validate phone |
| Tỉnh / Thành phố | Select | Required |
| Quận / Huyện | Select | Required, phụ thuộc tỉnh |
| Địa chỉ chi tiết | Textarea/Input | Required |
| Submit | Button | Disabled khi form invalid |

Submit gọi:

```http
POST /me/profile/complete
```

Sau success:

```ts
router.replace("/owner")
```

FE validation:

```ts
const phoneRegex = /^(0|\+84)[0-9]{9,10}$/
```

### 7.3 Module Profile

Route đề xuất:

```text
web-admin/src/app/owner/profile/page.tsx
```

API dùng:

```http
GET /me/profile
```

UI hiển thị:

```text
Hồ sơ cá nhân

Avatar

Họ tên: Nguyễn Văn A
Email: owner@gmail.com
Số điện thoại: 0901234567
Địa chỉ: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
Role: OWNER
Đăng nhập bằng: Google

[Chỉnh sửa hồ sơ]
```

### 7.4 Module Profile Setting

Route đề xuất:

```text
web-admin/src/app/owner/settings/profile/page.tsx
```

API dùng:

```http
GET /me/profile
PUT /me/profile
```

Rule:

- Email disabled.
- Không gửi email lên BE.
- Nếu gửi nhầm, BE cũng bỏ qua.
- Sau khi save thành công, update local auth user/profile state.
- Hiển thị toast: `Cập nhật hồ sơ thành công`.

### 7.5 FE route guard

```ts
function requireProfileCompleted(user) {
  if (!user) {
    return "/login"
  }

  if (!user.isProfileCompleted) {
    return "/complete-profile"
  }

  return null
}
```

Áp dụng cho owner routes:

- `/owner`
- `/owner/rooms`
- `/owner/tenants`
- `/owner/contracts`
- `/owner/settings`
- `/owner/bookings`
- `/owner/messages`
- `/owner/trading`

Không áp dụng cho:

- `/login`
- `/register`
- `/complete-profile`

### 7.6 FE files dự kiến cần thay đổi

| File | Việc cần làm |
|---|---|
| `web-admin/src/app/login/page.tsx` | Sau Google auth check `nextStep` |
| `web-admin/src/app/register/page.tsx` nếu có | Sau Google auth check `nextStep` |
| `web-admin/src/app/complete-profile/page.tsx` | Tạo màn Complete Profile |
| `web-admin/src/app/owner/profile/page.tsx` | Tạo màn Profile |
| `web-admin/src/app/owner/settings/profile/page.tsx` | Tạo màn Profile Setting |
| `web-admin/src/lib/api.ts` hoặc service tương ứng | Thêm API client cho profile |
| `web-admin/src/lib/auth.ts` hoặc auth store | Lưu `isProfileCompleted`, `onboardingStep` |
| `web-admin/src/components/RouteGuard.tsx` nếu có | Chặn owner route khi chưa completed profile |
| `web-admin/src/legacy/components/pages/SettingsPage.jsx` | Thêm link/menu Profile Setting nếu dùng legacy |
| `web-admin/src/legacy/components/Layout` hoặc Sidebar | Thêm menu Profile |

## 8. API contract tổng hợp

### 8.1 POST /auth/google

```json
{
  "success": true,
  "action": "registered | logged_in | linked_and_logged_in",
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "user_123",
    "email": "owner@gmail.com",
    "name": "Nguyễn Văn A",
    "avatarUrl": "https://...",
    "role": "OWNER",
    "authProvider": "google",
    "isProfileCompleted": false,
    "onboardingStep": "COMPLETE_PROFILE"
  },
  "profile": null,
  "nextStep": "COMPLETE_PROFILE | DASHBOARD"
}
```

### 8.2 GET /me/profile

```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "owner@gmail.com",
    "name": "Nguyễn Văn A",
    "avatarUrl": "https://...",
    "role": "OWNER",
    "authProvider": "google",
    "isProfileCompleted": true,
    "onboardingStep": "DONE"
  },
  "profile": {
    "fullName": "Nguyễn Văn A",
    "phone": "0901234567",
    "provinceCode": "79",
    "provinceName": "TP. Hồ Chí Minh",
    "districtCode": "760",
    "districtName": "Quận 1",
    "addressLine": "123 Nguyễn Huệ",
    "fullAddress": "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
  }
}
```

### 8.3 POST /me/profile/complete

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "provinceCode": "79",
  "provinceName": "TP. Hồ Chí Minh",
  "districtCode": "760",
  "districtName": "Quận 1",
  "addressLine": "123 Nguyễn Huệ"
}
```

### 8.4 PUT /me/profile

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0909999999",
  "provinceCode": "79",
  "provinceName": "TP. Hồ Chí Minh",
  "districtCode": "769",
  "districtName": "Quận 2",
  "addressLine": "456 Mai Chí Thọ"
}
```

## 9. State machine onboarding

```text
REGISTERED
    ↓
COMPLETE_PROFILE
    ↓
DONE
```

Giá trị đề xuất:

```text
COMPLETE_PROFILE
DONE
```

| State | Ý nghĩa | Next |
|---|---|---|
| `COMPLETE_PROFILE` | User phải nhập profile bắt buộc | Complete Profile |
| `DONE` | User được dùng app | Dashboard |

## 10. Error handling

### 10.1 Google token invalid

```json
{
  "success": false,
  "code": "GOOGLE_TOKEN_INVALID",
  "message": "Google token không hợp lệ hoặc đã hết hạn."
}
```

### 10.2 Email chưa verified

```json
{
  "success": false,
  "code": "GOOGLE_EMAIL_NOT_VERIFIED",
  "message": "Email Google chưa được xác thực."
}
```

### 10.3 Profile required

```json
{
  "success": false,
  "code": "PROFILE_REQUIRED",
  "message": "Vui lòng hoàn tất hồ sơ trước khi sử dụng hệ thống.",
  "nextStep": "COMPLETE_PROFILE"
}
```

### 10.4 Validation error

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ.",
  "errors": {
    "phone": "Số điện thoại không hợp lệ",
    "provinceCode": "Vui lòng chọn tỉnh/thành phố"
  }
}
```

### 10.5 Account blocked

```json
{
  "success": false,
  "code": "ACCOUNT_BLOCKED",
  "message": "Tài khoản của bạn đã bị khóa."
}
```

## 11. Test cases

### 11.1 Register user mới bằng Google

Expected:

```text
BE tạo user mới.
is_profile_completed = false.
nextStep = COMPLETE_PROFILE.
FE chuyển sang Complete Profile.
Không cho vào Dashboard.
```

### 11.2 Login user cũ đã hoàn tất profile

Expected:

```text
BE trả action = logged_in.
nextStep = DASHBOARD.
FE vào Dashboard.
Profile show đầy đủ thông tin.
```

### 11.3 Login user cũ nhưng chưa hoàn tất profile

Expected:

```text
BE trả action = logged_in.
nextStep = COMPLETE_PROFILE.
FE chuyển sang Complete Profile.
```

### 11.4 Submit Complete Profile thiếu phone

Expected:

```text
BE trả VALIDATION_ERROR.
FE hiển thị lỗi số điện thoại.
Không update is_profile_completed.
```

### 11.5 Submit Complete Profile hợp lệ

Expected:

```text
BE lưu user_profiles.
BE update users.is_profile_completed = true.
BE update users.onboarding_step = DONE.
FE vào Dashboard.
Profile hiển thị thông tin vừa nhập.
```

### 11.6 Edit Profile Setting

Expected:

```text
BE update user_profiles.
Email không đổi.
Profile display cập nhật dữ liệu mới.
```

### 11.7 FE cố gửi email trong PUT /me/profile

Expected:

```text
BE bỏ qua field email.
users.email không thay đổi.
Response vẫn trả email cũ.
```

### 11.8 User chưa complete profile gọi API nghiệp vụ

Expected:

```json
{
  "success": false,
  "code": "PROFILE_REQUIRED",
  "nextStep": "COMPLETE_PROFILE"
}
```

## 12. Thứ tự triển khai đề xuất

### Phase 1: BE foundation

1. Thêm/migrate fields vào `users`.
2. Tạo bảng hoặc mock store `user_profiles`.
3. Tạo bảng hoặc mock store `social_accounts` nếu chưa có.
4. Tạo type/interface cho UserProfile.
5. Tạo validation profile.

### Phase 2: BE API

1. Sửa `POST /auth/google`.
2. Thêm `GET /me/profile`.
3. Thêm `POST /me/profile/complete`.
4. Thêm `PUT /me/profile`.
5. Thêm middleware `requireCompletedProfile`.
6. Gắn middleware vào route nghiệp vụ.
7. Test API bằng Postman/curl.

### Phase 3: FE auth routing

1. Sửa handler Google login/register.
2. Lưu thêm `isProfileCompleted`, `onboardingStep`, `nextStep`.
3. Nếu `nextStep = COMPLETE_PROFILE`, redirect `/complete-profile`.
4. Nếu `nextStep = DASHBOARD`, redirect `/owner`.
5. Thêm route guard cho owner routes.

### Phase 4: FE Complete Profile

1. Tạo page `/complete-profile`.
2. Load `GET /me/profile`.
3. Render form.
4. Validate form.
5. Submit `POST /me/profile/complete`.
6. Success thì redirect `/owner`.

### Phase 5: FE Profile

1. Tạo page `/owner/profile`.
2. Load `GET /me/profile`.
3. Hiển thị thông tin profile.
4. Thêm nút đến Profile Setting.

### Phase 6: FE Profile Setting

1. Tạo page `/owner/settings/profile`.
2. Load `GET /me/profile`.
3. Render form chỉnh sửa.
4. Email disabled.
5. Submit `PUT /me/profile`.
6. Show toast success.
7. Refresh profile state.

### Phase 7: QA

1. Test user mới.
2. Test user cũ.
3. Test profile thiếu field.
4. Test edit profile.
5. Test email readonly.
6. Test route guard.
7. Test BE middleware chặn API nghiệp vụ.

## 13. Acceptance Criteria

### Register

- User mới Google register không được vào dashboard ngay.
- User mới phải điền profile bắt buộc.
- Email lấy từ Google và readonly.
- User cũ đã hoàn tất profile login vào dashboard bình thường.
- User cũ chưa hoàn tất profile bị đưa về Complete Profile.

### Profile

- Profile hiển thị đúng email.
- Profile hiển thị đúng họ tên, số điện thoại, tỉnh, huyện, địa chỉ.
- Profile lấy data từ `GET /me/profile`.

### Profile Setting

- User chỉnh được họ tên.
- User chỉnh được số điện thoại.
- User chỉnh được tỉnh/huyện/địa chỉ.
- User không chỉnh được email.
- BE không update email dù FE cố gửi email.
- Sau khi lưu, Profile hiển thị data mới.

### Security / Guard

- User chưa complete profile không gọi được API nghiệp vụ.
- User chưa complete profile không vào được dashboard bằng URL trực tiếp.
- User blocked không login được.
- Google email chưa verified không register/login được.

## 14. Ghi chú triển khai theo source hiện tại

Source hiện tại đang có:

```text
Backend command: cd money-manager-mobile/backend && npm run dev
Backend URL: http://localhost:8787
Frontend command: cd web-admin && npm run dev
Frontend URL: http://localhost:3001
```

Các module đã hoạt động:

- Settings
- Bank & Wallet Config
- Tenant Management
- Contract lifecycle
- Wallets & Transactions
- Booking / Leads
- Trading Inventory

Khi thêm profile guard, cần cẩn thận không làm gãy flow hiện có.

Nên bắt đầu bằng cách chỉ chặn ở FE trước, sau đó gắn BE middleware dần cho route nghiệp vụ. Ở production, BE middleware là bắt buộc vì FE guard không đủ an toàn.

## 15. Tóm tắt final flow

```text
Google Register/Login
        ↓
BE verify Google token
        ↓
Check user
        ↓
Nếu user mới:
    Create OWNER
    is_profile_completed = false
    nextStep = COMPLETE_PROFILE
        ↓
Nếu user cũ:
    Login
    Nếu profile thiếu:
        nextStep = COMPLETE_PROFILE
    Nếu profile đủ:
        nextStep = DASHBOARD
        ↓
Complete Profile bắt buộc:
    fullName
    phone
    province
    district
    addressLine
        ↓
BE lưu profile
BE set is_profile_completed = true
        ↓
Dashboard
        ↓
Profile hiển thị thông tin
        ↓
Profile Setting cho edit thông tin
Email luôn readonly
```
