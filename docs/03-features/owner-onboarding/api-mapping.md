# Owner Onboarding — API Mapping

## Endpoints

| Method | Endpoint | FE Caller | Purpose |
|---|---|---|---|
| `POST` | `/auth/owner-google` | `OwnerGoogleLoginButton` | Authenticate owner via Google OAuth. Returns `accessToken`, `user`, `profile`, `nextStep`. |
| `POST` | `/auth/login` | `web-admin/src/lib/api.ts` | Standard email/password login (legacy path). |
| `POST` | `/auth/admin-login` | `/login/admin` page | Admin username/password authentication. |
| `POST` | `/auth/refresh` | Auth interceptors | Refresh access token using stored refresh token. |
| `POST` | `/auth/logout` | Owner shell / lib logout | Clears server-side refresh token. |
| `GET` | `/auth/me` | Owner shell, route guards | Returns current authenticated user identity. |
| `GET` | `/me/profile` | Complete-profile page, Settings page, Owner shell | Returns user identity + profile data (or null if incomplete). |
| `POST` | `/me/profile/complete` | `/complete-profile` page | Submits required profile fields, marks onboarding complete. |
| `PUT` | `/me/profile` | `/owner/settings/profile` page | Updates editable profile fields. Email is ignored if sent. |
| `GET` | `/locations/provinces` | Profile forms | Returns static list of Vietnamese provinces. |
| `GET` | `/locations/districts?provinceCode=...` | Profile forms | Returns districts filtered by province code. |

## Code Paths

| Layer | File |
|---|---|
| FE Login Page | `web-admin/src/app/login/owner/page.tsx` |
| FE Google Button | `web-admin/src/components/OwnerGoogleLoginButton.tsx` |
| FE Complete Profile Page | `web-admin/src/app/complete-profile/page.tsx` |
| FE Profile Service | `web-admin/src/lib/profile.ts` |
| BE Auth Routes | `backend/src/routes/auth.ts` |
| BE Profile Routes | `backend/src/routes/profile.ts` |
| BE Profile Guard | `backend/src/middleware/requireCompletedProfile.ts` |
