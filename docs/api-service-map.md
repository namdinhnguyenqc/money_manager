# API and Service Map

This document maps active backend routes to frontend service calls and pages. It is intentionally implementation-focused so agents can modify flows without searching the whole repo.

## Base URLs

| Context | URL |
|---|---|
| Frontend dev | `http://localhost:3001` |
| Backend dev | `http://localhost:8787` |
| FE env var | `NEXT_PUBLIC_API_URL`, defaults to `http://localhost:8787` |

## Frontend API Clients

| File | Purpose |
|---|---|
| `web-admin/src/utils/apiClient.ts` | Main typed helper for `apiGet/apiPost/apiPatch/apiPut/apiDelete`; handles profile-required redirects and field errors. |
| `web-admin/src/lib/api.ts` | Older helper with `apiClient`, `login`, `logout`; still used by some pages/components. |
| `web-admin/src/lib/profile.ts` | Profile-specific client and validation. |
| `web-admin/src/lib/rentalOps.ts` | Owner ops service layer for facilities, rooms, contracts, invoices, payments, wallets, and validation helpers. |

## Auth and Profile APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `POST` | `/auth/login` | `web-admin/src/lib/api.ts` | Login endpoint. |
| `POST` | `/auth/admin-login` | `/login/admin` | Admin username/password. |
| `POST` | `/auth/google` | General Google/mobile path | Google Auth. |
| `POST` | `/auth/owner-google` | `OwnerGoogleLoginButton` | Owner Google login; returns `nextStep`. |
| `POST` | `/auth/refresh` | Auth clients | Refresh token. |
| `POST` | `/auth/logout` | Owner shell and lib logout | Clears server refresh token in real mode. |
| `GET` | `/auth/me` | Owner shell, guards | Current auth user. |
| `GET` | `/me/profile` | Complete/profile/settings pages, owner shell | Profile state. |
| `POST` | `/me/profile/complete` | `/complete-profile` | Required onboarding. |
| `PUT` | `/me/profile` | `/owner/settings/profile` | Update profile; email readonly. |
| `GET` | `/locations/provinces` | Profile form | Static local data. |
| `GET` | `/locations/districts?provinceCode=...` | Profile form | Static local data. |

## Owner Facility and Room APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/owner/boarding-houses` | `loadBoardingHouses()` | Facility list. |
| `POST` | `/owner/boarding-houses` | `createBoardingHouse()` | Create facility. |
| `GET` | `/owner/boarding-houses/:id` | `loadBoardingHouse()` | Facility detail. |
| `PATCH` | `/owner/boarding-houses/:id` | `updateBoardingHouse()` | Update facility. |
| `DELETE` | `/owner/boarding-houses/:id` | `deleteBoardingHouse()` | Delete facility. |
| `GET` | `/owner/boarding-houses/:id/rooms` | `loadOwnerRooms()` | Owner-facing room list. |
| `POST` | `/owner/boarding-houses/:id/rooms` | `createOwnerRoom()` | Create room. |
| `PATCH` | `/owner/rooms/:id` | `updateRoom()` | Update owner room by owner-room id. |
| `DELETE` | `/owner/rooms/:id` | owner pages where wired | Delete owner room. |

## Rental Ops APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/rental/rooms?buildingId=...` | `loadRentalRooms()` | Operational room list; enriches invoice and tenant data. |
| `POST` | `/rental/rooms` | currently service exists but main new-room UI uses owner room API | Legacy/internal room create. |
| `PATCH` | `/rental/rooms/:id` | `updateRoom()` currently calls owner route, not this one | Needs care: ids differ. |
| `DELETE` | `/rental/rooms/:id` | `deleteRoom()` | Deletes legacy rental room; blocked if active contract. |
| `GET` | `/rental/tenants` | pages/service where needed | Tenant list. |
| `POST` | `/rental/tenants` | `createTenant()` | Validates phone/CCCD/email before BE call. |
| `PATCH` | `/rental/tenants/:id` | service/page where wired | Update tenant. |
| `GET` | `/rental/services` | invoice/contract pages | Utility/service list. |
| `POST` | `/rental/services` | service where wired | Create service. |
| `PATCH` | `/rental/services/:id` | service where wired | Update service price/active. |
| `DELETE` | `/rental/services/:id` | service where wired | Delete service. |
| `GET` | `/rental/contracts/active` | contract/invoice helpers | Active contract list. |
| `POST` | `/rental/contracts` | `createContract()` | Creates contract and marks room occupied. |
| `PATCH` | `/rental/contracts/:id` | service where wired | Update contract and services. |
| `POST` | `/rental/contracts/:id/terminate` | `terminateContract()` | Ends contract, frees room, optional deposit refund transaction. |
| `GET` | `/rental/contracts/:id/services` | invoice/contract helpers | Contract services. |
| `DELETE` | `/rental/contracts/:id` | `deleteContract()` | Deletes contract and frees room. |

## Invoice and Payment APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/invoices?buildingId=&month=&year=&roomId=&status=` | `loadInvoices()` | Invoice list. |
| `POST` | `/invoices` | `createInvoice()` | Creates invoice; rejects duplicates. |
| `GET` | `/invoices/history/:contractId` | `loadInvoicesByContract()` currently filters client-side instead | Backend path exists. |
| `GET` | `/invoices/previous-debt` | invoice form helpers | Previous unpaid debt. |
| `GET` | `/invoices/latest-meter-readings?roomId=` | `loadLatestMeterReadings()` | Latest meter values. |
| `GET` | `/invoices/:id` | `loadInvoice()` | Invoice detail. |
| `POST` | `/invoices/:id/mark-paid` | `recordPayment()` | Sets invoice paid after FE creates transaction. |
| `POST` | `/invoices/:id/collect-payment` | Not used by current FE | Combined payment endpoint. Consider future migration. |
| `DELETE` | `/invoices/:id` | `deleteInvoice()` | Deletes invoice and linked transaction if present. |
| `POST` | `/invoices/bulk-create` | `bulkCreateInvoices()` | Bulk invoice creation. |
| `POST` | `/invoices/bulk-collect-payment` | `bulkCollectPayments()` | Bulk payment collection. |
| `POST` | `/invoices/auto-generate` | Not clearly wired | Generates draft invoices for occupied rooms. |
| `GET` | `/wallets` | `loadWallets()` | Payment wallet selector. |
| `POST` | `/transactions` | `recordPayment()` | Creates income transaction before marking invoice paid. |

## Public APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/public/boarding-houses` | public list page | Active/public facilities. |
| `GET` | `/public/boarding-houses/:id` | public detail page | Active/public facility detail. |
| `GET` | `/public/rooms?bhId=:id` | public detail page | Public rooms in facility. |
| `POST` | `/public/leads` | `LeadForm` | Creates guest lead. |
| `POST` | `/public/bookings` | public detail booking form | Creates booking request. |

## Owner Leads, Booking, Messaging, Notification APIs

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/owner/leads` | Owner lead list. |
| `GET` | `/owner/bookings` | Owner booking requests. |
| `POST` | `/owner/bookings/:id/confirm` | Confirms booking. |
| `POST` | `/owner/bookings/:id/reject` | Rejects booking. |
| `GET` | `/owner/conversations` | Owner inbox. |
| `GET` | `/owner/conversations/:id/messages` | Conversation messages. |
| `POST` | `/owner/conversations/:id/messages` | Owner reply. |
| `GET` | `/owner/notifications` | Owner notifications. |
| `GET` | `/owner/audit-logs` | Owner audit log. |
| `GET` | `/owner/settings` | Owner settings. |
| `POST` | `/owner/settings` | Update owner settings. |

## Admin APIs

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/admin/users` | List users. |
| `GET` | `/admin/users/:id` | User detail. |
| `PATCH` | `/admin/users/:id/status` | Change user status. |
| `PATCH` | `/admin/users/:id/role` | Change user role; super admin only. |
| `DELETE` | `/admin/users/:id` | Delete user. |
| `GET` | `/admin/stats` | Admin stats. |
| `GET/POST/PATCH/DELETE` | `/admin/boarding-houses` and `/:id` | Admin facility CRUD. |
| `GET/POST/PATCH/DELETE` | `/admin/rooms` and `/:id` | Admin room CRUD. |

## Verification Status

- **Supabase Connectivity**: Verified on local Hono server.
- **Build Status**: Both Frontend and Backend pass production build.
- **Data Isolation**: `user_id`/`owner_id` filtering implemented in active routes.
