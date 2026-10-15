# Danh sách endpoint

Sinh tự động từ `backend/src` bằng `node tools/gen-endpoints-map.mjs`. Đừng sửa tay; chạy lại script sau khi thêm hoặc đổi route.

Tổng cộng 286 endpoint. Quy tắc lỗi và header chung: [api-governance.md](api-governance.md).

## `routes/admin.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/admin/users` |
| `GET` | `/admin/users/:id` |
| `PATCH` | `/admin/users/:id/status` |
| `PATCH` | `/admin/users/:id/plan` |
| `PATCH` | `/admin/users/:id/limits` |
| `GET` | `/admin/users/:id/permissions` |
| `PATCH` | `/admin/users/:id/permissions` |
| `GET` | `/admin/roles` |
| `GET` | `/admin/roles/:id` |
| `PATCH` | `/admin/roles/:id/permissions` |
| `PATCH` | `/admin/roles/:id/limits` |
| `GET` | `/admin/owner-approvals` |
| `PATCH` | `/admin/owner-approvals/:id` |
| `PATCH` | `/admin/users/:id/role` |
| `DELETE` | `/admin/users/:id` |
| `GET` | `/admin/stats` |
| `GET` | `/admin/boarding-houses` |
| `GET` | `/admin/boarding-houses/:id` |
| `POST` | `/admin/boarding-houses` |
| `PATCH` | `/admin/boarding-houses/:id` |
| `DELETE` | `/admin/boarding-houses/:id` |
| `GET` | `/admin/rooms` |
| `GET` | `/admin/rooms/:id` |
| `POST` | `/admin/rooms` |
| `PATCH` | `/admin/rooms/:id` |
| `DELETE` | `/admin/rooms/:id` |
| `GET` | `/admin/accounts` |
| `GET` | `/admin/accounts/summary` |
| `POST` | `/admin/accounts/:id/lock` |
| `POST` | `/admin/accounts/:id/unlock` |
| `GET` | `/admin/audit-logs` |
| `GET` | `/admin/audit-logs/:id` |
| `GET` | `/admin/me/permissions` |
| `GET` | `/admin/admin-users` |
| `GET` | `/admin/roles` |
| `GET` | `/admin/roles/:id` |
| `PATCH` | `/admin/roles/:id/permissions` |
| `GET` | `/admin/owners` |
| `GET` | `/admin/owners/:id` |
| `POST` | `/admin/owners/:id/lock` |
| `POST` | `/admin/owners/:id/unlock` |
| `GET` | `/admin/tenants` |
| `GET` | `/admin/tenants/:id` |
| `POST` | `/admin/tenants/:id/lock` |
| `POST` | `/admin/tenants/:id/unlock` |
| `POST` | `/admin/properties/:id/lock` |
| `POST` | `/admin/properties/:id/unlock` |
| `GET` | `/admin/properties` |
| `GET` | `/admin/properties/:id` |
| `GET` | `/admin/contracts` |
| `GET` | `/admin/contracts/:id` |
| `POST` | `/admin/contracts/:id/cancel` |
| `GET` | `/admin/invoices` |
| `GET` | `/admin/invoices/:id` |
| `POST` | `/admin/invoices/:id/mark-paid` |
| `POST` | `/admin/invoices/:id/cancel` |
| `GET` | `/admin/dashboard/summary` |
| `GET` | `/admin/dashboard/charts` |
| `GET` | `/admin/dashboard/alerts` |
| `GET` | `/admin/reports/owners` |
| `GET` | `/admin/reports/tenants` |
| `GET` | `/admin/reports/rooms` |
| `GET` | `/admin/reports/contracts` |
| `GET` | `/admin/reports/invoices` |
| `GET` | `/admin/system-config` |
| `PATCH` | `/admin/system-config` |
| `GET` | `/admin/notifications` |
| `POST` | `/admin/notifications` |
| `POST` | `/admin/notifications/:id/send` |
| `POST` | `/admin/notifications/:id/cancel` |

## `routes/adminArticles.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/admin/articles` |
| `GET` | `/admin/articles/:id` |
| `POST` | `/admin/articles` |
| `PUT` | `/admin/articles/:id` |
| `DELETE` | `/admin/articles/:id` |
| `POST` | `/admin/articles/upload-image` |
| `GET` | `/admin/articles/meta/stats` |

## `routes/articleTaxonomy.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/public/categories` |
| `GET` | `/public/categories/:slug` |
| `GET` | `/public/tags` |
| `GET` | `/public/authors/:slug` |
| `GET` | `/admin/taxonomy/categories` |
| `POST` | `/admin/taxonomy/categories` |
| `PUT` | `/admin/taxonomy/categories/:id` |
| `DELETE` | `/admin/taxonomy/categories/:id` |
| `GET` | `/admin/taxonomy/tags` |
| `POST` | `/admin/taxonomy/tags` |
| `DELETE` | `/admin/taxonomy/tags/:id` |
| `GET` | `/admin/taxonomy/authors` |
| `POST` | `/admin/taxonomy/authors` |
| `PUT` | `/admin/taxonomy/authors/:id` |
| `DELETE` | `/admin/taxonomy/authors/:id` |

## `routes/auth.ts`

| Method | Đường dẫn |
|---|---|
| `POST` | `/auth/login` |
| `POST` | `/auth/admin-login` |
| `POST` | `/auth/google` |
| `POST` | `/auth/owner-google` |
| `POST` | `/auth/refresh` |
| `POST` | `/auth/logout` |
| `POST` | `/auth/logout-all` |
| `GET` | `/auth/me` |
| `POST` | `/api/auth/login` |
| `POST` | `/api/auth/admin-login` |
| `POST` | `/api/auth/google` |
| `POST` | `/api/auth/owner-google` |
| `POST` | `/api/auth/refresh` |
| `POST` | `/api/auth/logout` |
| `POST` | `/api/auth/logout-all` |
| `GET` | `/api/auth/me` |

## `routes/bankConfig.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/bank-config` |
| `PUT` | `/bank-config` |

## `routes/categories.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/categories` |
| `POST` | `/categories` |
| `PATCH` | `/categories/:id` |
| `DELETE` | `/categories/:id` |

## `routes/feedback.ts`

| Method | Đường dẫn |
|---|---|
| `POST` | `/owner/feedback` |
| `GET` | `/owner/feedback` |
| `GET` | `/owner/feedback/:id` |
| `POST` | `/owner/feedback/:id/comments` |
| `POST` | `/owner/feedback/:id/close` |
| `POST` | `/owner/feedback/:id/reopen` |
| `GET` | `/admin/feedback/all` |
| `GET` | `/admin/feedback/:id` |
| `PATCH` | `/admin/feedback/:id/status` |
| `POST` | `/admin/feedback/:id/comments` |

## `routes/health.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/health` |

## `routes/invoices.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/invoices` |
| `GET` | `/invoices/export-excel` |
| `POST` | `/invoices` |
| `GET` | `/invoices/history/:contractId` |
| `GET` | `/invoices/previous-debt` |
| `POST` | `/invoices/ocr-meter-readings` |
| `GET` | `/invoices/latest-meter-readings` |
| `GET` | `/invoices/:id` |
| `POST` | `/invoices/:id/items` |
| `POST` | `/invoices/:id/mark-paid` |
| `POST` | `/invoices/:id/collect-payment` |
| `POST` | `/invoices/bulk-collect-payment` |
| `DELETE` | `/invoices/:id` |
| `POST` | `/invoices/auto-generate` |
| `POST` | `/invoices/bulk-create` |

## `routes/locations.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/locations/provinces` |
| `GET` | `/locations/districts` |

## `routes/owner.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/owner/dashboard-init` |
| `GET` | `/owner/cashflow-summary` |
| `GET` | `/owner/dashboard-summary` |
| `GET` | `/owner/boarding-houses` |
| `GET` | `/owner/boarding-houses/:id` |
| `GET` | `/owner/boarding-houses/:id/blocks` |
| `POST` | `/owner/boarding-houses/:id/blocks` |
| `PATCH` | `/owner/boarding-houses/:id/blocks/:blockId` |
| `DELETE` | `/owner/boarding-houses/:id/blocks/:blockId` |
| `POST` | `/owner/boarding-houses` |
| `PATCH` | `/owner/boarding-houses/:id` |
| `DELETE` | `/owner/boarding-houses/:id` |
| `GET` | `/owner/boarding-houses/:id/rooms` |
| `POST` | `/owner/boarding-houses/:id/rooms` |
| `PATCH` | `/owner/rooms/:id` |
| `DELETE` | `/owner/rooms/:id` |
| `GET` | `/owner/notifications` |
| `GET` | `/owner/notification-preferences` |
| `PATCH` | `/owner/notification-preferences` |
| `POST` | `/owner/notification-devices` |
| `DELETE` | `/owner/notification-devices` |
| `POST` | `/owner/notifications/:id/read` |
| `POST` | `/owner/notifications/read-all` |
| `GET` | `/owner/audit-logs` |
| `GET` | `/owner/sepay/events` |
| `POST` | `/owner/sepay/events/:id/reprocess` |
| `GET` | `/owner/settings` |
| `POST` | `/owner/settings` |
| `GET` | `/owner/permissions` |
| `POST` | `/owner/simulate-upgrade` |
| `POST` | `/owner/ocr-cccd` |

## `routes/paymentChannels.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/payment-channels` |
| `POST` | `/payment-channels` |
| `PATCH` | `/payment-channels/:id` |
| `DELETE` | `/payment-channels/:id` |

## `routes/profile.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/me/profile` |
| `POST` | `/me/profile/complete` |
| `PUT` | `/me/profile` |

## `routes/publicArticles.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/public/articles` |
| `GET` | `/public/articles/featured` |
| `GET` | `/public/articles/popular` |
| `GET` | `/public/articles/sitemap-data` |
| `GET` | `/public/articles/:slug` |

## `routes/rental.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/rental/room-types` |
| `POST` | `/rental/room-types` |
| `PATCH` | `/rental/room-types/:id` |
| `DELETE` | `/rental/room-types/:id` |
| `GET` | `/rental/rooms` |
| `GET` | `/rental/deposits` |
| `POST` | `/rental/deposits` |
| `PATCH` | `/rental/deposits/:id` |
| `POST` | `/rental/deposits/:id/forfeit` |
| `POST` | `/rental/rooms` |
| `PATCH` | `/rental/rooms/:id` |
| `DELETE` | `/rental/rooms/:id` |
| `GET` | `/rental/tenants` |
| `POST` | `/rental/tenants` |
| `PATCH` | `/rental/tenants/:id` |
| `DELETE` | `/rental/tenants/:id` |
| `GET` | `/rental/services` |
| `POST` | `/rental/services` |
| `PATCH` | `/rental/services/:id` |
| `DELETE` | `/rental/services/:id` |
| `POST` | `/rental/services/:id/price-update` |
| `GET` | `/rental/services/:id/price-history` |
| `GET` | `/rental/rooms/:roomId/services` |
| `POST` | `/rental/rooms/:roomId/services` |
| `PATCH` | `/rental/room-services/:id` |
| `GET` | `/rental/rooms/:roomId/adjustments` |
| `POST` | `/rental/rooms/:roomId/adjustments` |
| `DELETE` | `/rental/room-adjustments/:id` |
| `POST` | `/rental/services/seed-defaults` |
| `GET` | `/rental/contracts` |
| `GET` | `/rental/contracts/active` |
| `GET` | `/rental/contracts/:id` |
| `POST` | `/rental/contracts` |
| `PATCH` | `/rental/contracts/:id` |
| `POST` | `/rental/contracts/:id/renew` |
| `POST` | `/rental/contracts/:id/terminate` |
| `GET` | `/rental/contracts/:id/settlement-preview` |
| `GET` | `/rental/contracts/:id/refund` |
| `DELETE` | `/rental/contracts/:id` |
| `GET` | `/rental/contracts/:id/services` |

## `routes/sepayWebhook.ts`

| Method | Đường dẫn |
|---|---|
| `POST` | `/webhooks/sepay` |

## `routes/tenantApi.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/tenant/me` |
| `GET` | `/tenant/dashboard` |
| `GET` | `/tenant/invoices` |
| `GET` | `/tenant/invoices/:id` |
| `GET` | `/tenant/utilities` |
| `GET` | `/tenant/transactions` |
| `POST` | `/tenant/transactions` |
| `PATCH` | `/tenant/transactions/:id` |
| `DELETE` | `/tenant/transactions/:id` |
| `GET` | `/tenant/categories` |
| `POST` | `/tenant/categories` |
| `PATCH` | `/tenant/categories/:id` |
| `DELETE` | `/tenant/categories/:id` |
| `GET` | `/tenant/notifications` |
| `POST` | `/tenant/notifications/read-all` |
| `PATCH` | `/tenant/notifications/:id/read` |
| `POST` | `/tenant/fcm/register` |
| `DELETE` | `/tenant/fcm/unregister` |

## `routes/tenantAuth.ts`

| Method | Đường dẫn |
|---|---|
| `POST` | `/tenant-auth/register` |
| `POST` | `/tenant-auth/login` |
| `POST` | `/tenant-auth/refresh` |
| `POST` | `/tenant-auth/change-password` |
| `GET` | `/tenant-auth/invite/:code` |
| `POST` | `/tenant-auth/forgot-password` |

## `routes/trading.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/trading/items` |
| `GET` | `/trading/items/batch/:batchId` |
| `POST` | `/trading/items` |
| `PATCH` | `/trading/items/:id` |
| `DELETE` | `/trading/items/:id` |
| `GET` | `/trading/stats` |

## `routes/transactions.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/transactions` |
| `POST` | `/transactions` |
| `PATCH` | `/transactions/:id` |
| `DELETE` | `/transactions/:id` |

## `routes/wallets.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/wallets` |
| `POST` | `/wallets` |
| `PATCH` | `/wallets/:id` |
| `GET` | `/wallets/:id/stats` |
| `DELETE` | `/wallets/:id` |

## `routes/webPush.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/push/vapid-key` |
| `POST` | `/push/subscribe` |
| `DELETE` | `/push/subscribe` |

## `routes/zalo.ts`

| Method | Đường dẫn |
|---|---|
| `GET` | `/api/zca/status` |
| `POST` | `/api/zca/qr/start` |
| `GET` | `/api/zca/qr/:sessionId` |
| `POST` | `/api/zca/disconnect` |
| `GET` | `/api/auth/zalo/login` |
| `GET` | `/api/auth/zalo/callback` |
| `POST` | `/api/auth/zalo/disconnect` |
| `GET` | `/api/integrations/zalo-oa/connect` |
| `GET` | `/api/integrations/zalo-oa/callback` |
| `GET` | `/api/integrations/zalo-oa/status` |
| `POST` | `/api/integrations/zalo-oa/disconnect` |
| `GET` | `/api/invoices/:invoiceId/image` |
| `POST` | `/api/invoices/:invoiceId/send-zalo` |
| `POST` | `/api/invoices/:invoiceId/send-reminder-zalo` |
| `POST` | `/api/invoices/:invoiceId/resend-zalo` |
| `POST` | `/api/invoices/send-zalo-bulk` |
| `GET` | `/api/invoices/send-zalo-bulk/:jobId` |
| `GET` | `/api/invoices/:invoiceId/zalo-history` |
