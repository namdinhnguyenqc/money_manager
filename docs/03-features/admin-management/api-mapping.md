# Admin Management — API Mapping

## Admin APIs

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/admin/users` | List all users. |
| `GET` | `/admin/users/:id` | User detail. |
| `PATCH` | `/admin/users/:id/status` | Block/unblock user. |
| `PATCH` | `/admin/users/:id/role` | Change role (super admin only). |
| `DELETE` | `/admin/users/:id` | Delete user. |
| `GET` | `/admin/stats` | Platform statistics (user count, boarding house count, etc.). |
| `GET/POST/PATCH/DELETE` | `/admin/boarding-houses`, `/admin/boarding-houses/:id` | Admin facility CRUD. |
| `GET/POST/PATCH/DELETE` | `/admin/rooms`, `/admin/rooms/:id` | Admin room CRUD. |

## Auth API

| Method | Endpoint | Notes |
|---|---|---|
| `POST` | `/auth/admin-login` | Admin username/password login. |

## Code Paths

| Layer | File |
|---|---|
| FE Admin Login | `web-admin/src/app/login/admin/page.tsx` |
| FE Admin Users | `web-admin/src/app/admin/users/page.tsx`, `users/[id]/page.tsx` |
| BE Admin Routes | `backend/src/routes/admin.ts` |
| BE Auth Routes | `backend/src/routes/auth.ts` |
