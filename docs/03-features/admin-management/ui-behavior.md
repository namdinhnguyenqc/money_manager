# Admin Management — UI Behavior

## Admin Login (`/login/admin`)
- Username/password form.
- On success, stores session and redirects to `/admin/users`.

## Admin Users Page (`/admin/users`)
- Lists users with: name, email, role, status.
- Click row to open user detail.
- ConfirmDialog for destructive actions (block, delete).

## Admin User Detail (`/admin/users/:id`)
- Shows user info: email, role, status, registration date.
- Actions: block/unblock, change role (super admin only), delete.
- Role change uses a select dropdown.

## Admin Dashboard
- Shows aggregate stats: total users, boarding houses, rooms.
- Working in local/mock mode.
