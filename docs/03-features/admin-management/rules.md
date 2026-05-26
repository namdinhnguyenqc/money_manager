# Admin Management — Rules

## Role Hierarchy
| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | All admin permissions + change user roles |
| `ADMIN` | View/block/unblock users, manage boarding houses/rooms, view stats |
| `OWNER` | No admin access |
| `USER/GUEST` | No admin access |

## Permission Rules
- Only `SUPER_ADMIN` can change user roles via `PATCH /admin/users/:id/role`.
- Both `ADMIN` and `SUPER_ADMIN` can block/unblock users via `PATCH /admin/users/:id/status`.
- Both can delete users via `DELETE /admin/users/:id`.
- Admin login uses username/password at `/login/admin` — not Google OAuth.

## Admin Boarding House/Room Management
- Admin CRUD on boarding houses and rooms is system-wide (not scoped to owner).
- Admin can toggle status and isPublic for any listing.
