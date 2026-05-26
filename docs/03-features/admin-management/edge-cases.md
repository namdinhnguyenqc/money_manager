# Admin Management — Edge Cases

## 1. Self-Role Change
- Admin should not be able to change their own role or block themselves.
- Backend should guard against this.

## 2. Last Super Admin
- Blocking or demoting the last SUPER_ADMIN leaves the system without governance.
- Consider adding a guard to prevent this.

## 3. Audit Logging
- Key admin actions (block, unblock, role change, delete) create audit log entries.
- Audit logs are viewable at `GET /owner/audit-logs` (owner-scoped) and should have admin-scoped equivalent.
