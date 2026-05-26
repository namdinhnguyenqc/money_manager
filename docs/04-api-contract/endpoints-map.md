# System Endpoints & Routing Map

This document catalogs every active route exposed by the TrọCare Hono backend and maps them to the respective mobile and web client service callers.

> [!IMPORTANT]
> **Route Prefix Mounting**: All endpoints below are mounted in `backend/src/index.ts`. For example, endpoints listed under `/rental/*` are served from `routes/rental.ts`, and `/invoices/*` from `routes/invoices.ts`.

---

## 1. Authentication & Landlord Profile APIs

**Route file**: `backend/src/routes/auth.ts`, `backend/src/routes/profile.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `POST` | `/auth/google` | `mobile/lib/auth.ts` → `loginWithGoogle()` | Generic Google OAuth token exchange. Accepts `idToken`, `platform`, `deviceId`, `fcmToken`. |
| `POST` | `/auth/owner-google` | `mobile/lib/auth.ts` → `loginWithGoogle()` | Landlord Google OAuth. Returns `accessToken`, `refreshToken`, `nextStep` (onboarding flag). |
| `POST` | `/auth/admin-login` | Web-admin only | Super-admin credential login. |
| `POST` | `/auth/refresh` | `mobile/lib/api.ts` → auto-interceptor | Silently refreshes access token using stored `refreshToken`. |
| `POST` | `/auth/logout` | `mobile/lib/auth.ts` → `logout()` | Clears refresh tokens. Accepts optional `fcmToken` to de-register push. |
| `POST` | `/auth/logout-all` | — | Logs out all devices for current user (deletes all refresh tokens). |
| `GET` | `/auth/me` | `mobile/lib/auth.ts` → `checkAuth()` | Validates JWT. Returns `{ id, email, role, is_profile_completed }`. |
| `GET` | `/me/profile` | Mobile profile screens | Fetches landlord profile (full_name, phone, id_card, address, etc.). |
| `POST` | `/me/profile/complete` | Mobile onboarding flow | Complete profile (requires phone, full_name, id_card). |
| `PUT` | `/me/profile` | Mobile profile settings | Updates profile. **Email is READONLY**. |
| `GET` | `/locations/provinces` | Profile completion dropdowns | Vietnamese province codes. |
| `GET` | `/locations/districts` | Profile completion dropdowns | Districts for a given province. |

---

## 2. Owner Facility (Boarding House) Management

**Route file**: `backend/src/routes/owner.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/owner/boarding-houses` | `facilityStore` → `loadFacilities()` | Lists all boarding houses owned by the authenticated user. |
| `POST` | `/owner/boarding-houses` | `facilityStore` → `createFacility()` | Creates a new boarding house. |
| `GET` | `/owner/boarding-houses/:id` | `facilityStore` → `loadFacility()` | Fetches detailed facility config (name, address, coords, status). |
| `PATCH` | `/owner/boarding-houses/:id` | `facilityStore` → `updateFacility()` | Modifies facility details, visibility, or status. |
| `DELETE` | `/owner/boarding-houses/:id` | `facilityStore` → `deleteFacility()` | Deletes a boarding house (blocked if rooms have active leases). |
| `GET` | `/owner/boarding-houses/:id/rooms` | `facilityStore` | Lists rooms under a specific facility (owner-level view). |
| `POST` | `/owner/boarding-houses/:id/rooms` | `facilityStore` | Adds physical rooms to a facility. |
| `PATCH` | `/owner/rooms/:id` | `facilityStore` | Edits room descriptions, utility rates, and status. |
| `DELETE` | `/owner/rooms/:id` | `facilityStore` | Deletes a room (blocked by active contracts). |

---

## 3. Operational Rental — Room Management

**Route file**: `backend/src/routes/rental.ts`

These APIs provide **operational** room views enriched with active contract/tenant data (unlike owner routes which are facility-level).

### 3.1 Room Types

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/room-types` | — | Lists room type taxonomy (e.g., "Phòng đơn", "Phòng đôi"). |
| `POST` | `/rental/room-types` | — | Creates a new room type. |
| `PATCH` | `/rental/room-types/:id` | — | Updates a room type name/config. |
| `DELETE` | `/rental/room-types/:id` | — | Deletes a room type. |

### 3.2 Rooms (Rental View)

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/rooms` | `rentalOps.ts` → `loadRentalRooms()` | Lists all rooms with enriched contract + tenant data. Optional `?buildingId=` filter. Returns `status`, `contractId`, `tenantName`, `tenantPhone`, `hasAc`, `numPeople`. |
| `GET` | `/rental/rooms/:id` | `facilityStore` → `loadRoom()` | Fetches single room detail. |
| `POST` | `/rental/rooms` | Implicit (room creation) | Creates a new rental room. Requires `name`, `price`, `boarding_house_id`. |
| `PATCH` | `/rental/rooms/:id` | `rentalOps.ts` → `updateRoom()` | Updates room fields including `status` (`vacant`, `occupied`, `maintenance`), `price`, `name`, `has_ac`, `num_people`. |
| `DELETE` | `/rental/rooms/:id` | `rentalOps.ts` → `deleteRoom()` | Deletes a room. Blocked if active contracts exist. |

---

## 4. Operational Rental — Deposits (Đặt Cọc Giữ Chỗ)

**Route file**: `backend/src/routes/rental.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/deposits` | `rentalOps.ts` → `loadDeposits()` | Lists all deposits for the owner. Returns enriched data with room name, tenant info, and status. |
| `POST` | `/rental/deposits` | `rentalOps.ts` → `createDeposit()` | Creates a reservation deposit. Requires `roomId`, `tenantName`, `amount`, `depositDate`. Optionally creates a transaction and updates room status to `reserved`. |
| `PATCH` | `/rental/deposits/:id` | `rentalOps.ts` → `updateDepositStatus()` | Updates deposit status (`active` → `refunded` / `transferred`). Accepts `{ status, note }`. |

---

## 5. Operational Rental — Tenants

**Route file**: `backend/src/routes/rental.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/tenants` | `rentalOps.ts` → `loadTenants()` | Lists all tenants registered by the owner. |
| `POST` | `/rental/tenants` | `rentalOps.ts` → `createTenant()` | Creates a tenant. Validates: phone (10 digits), id_card/CCCD (12 digits). |
| `PATCH` | `/rental/tenants/:id` | `rentalOps.ts` → `updateTenant()` | Updates tenant profile (name, phone, id_card, email, address). |
| `DELETE` | `/rental/tenants/:id` | — | Deletes a tenant record. |

---

## 6. Operational Rental — Services & Contracts

**Route file**: `backend/src/routes/rental.ts`

### 6.1 Services (Dịch vụ)

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/services` | `rentalOps.ts` → `loadServices()` | Lists services. Default: `activeOnly=true`. Use `?activeOnly=0` for all. Returns `unitPrice`, `unitPriceAc`. |
| `POST` | `/rental/services` | `rentalOps.ts` → `createService()` | Creates a service (e.g., Điện, Nước, Rác). Fields: `name`, `type` (`fixed`/`metered`/`per_person`/`per_room`), `unit_price`, `unit_price_ac`, `unit`, `icon`. |
| `PATCH` | `/rental/services/:id` | `rentalOps.ts` → `updateService()` | Updates service config. |
| `DELETE` | `/rental/services/:id` | `rentalOps.ts` → `deleteService()` | Deletes a service. |

### 6.2 Contracts (Hợp đồng)

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/rental/contracts` | `rentalOps.ts` → `loadContracts()` | Lists all contracts. Optional filters: `?roomId=`, `?status=`. Returns enriched data with room/tenant info. |
| `GET` | `/rental/contracts/active` | — | Lists only active contracts with room/tenant enrichment. Deduplicates per room. |
| `GET` | `/rental/contracts/:id` | `rentalOps.ts` → `loadContract()` | Full contract detail including `applied_services_snapshot`, room info, tenant info. Falls back to `contract_services` table if snapshot is empty. |
| `POST` | `/rental/contracts` | `rentalOps.ts` → `createContract()` | Creates a lease. **Side effects**: (1) Blocks if room already has active contract. (2) Sets room status → `occupied`. (3) Records deposit in `deposits` table. (4) Creates income transaction for deposit if `walletId` provided. (5) If room was reserved, transfers reservation deposit. |
| `PATCH` | `/rental/contracts/:id` | `rentalOps.ts` → `updateContract()` | Updates contract (startDate, deposit, occupantCount). Recalculates `applied_services_snapshot` if services or occupant count changed. |
| `POST` | `/rental/contracts/:id/terminate` | `rentalOps.ts` → `terminateContract()` | Terminates lease. **Side effects**: (1) Sets contract status → `ended`. (2) Updates deposits to `refunded`. (3) Creates `deposit_refunds` record. (4) Creates expense transaction for refund. (5) Creates income transaction for settlement. (6) Sets room status → `vacant`. |
| `GET` | `/rental/contracts/:id/settlement-preview` | Mobile termination screen | Calculates prorated rent for settlement. Accepts `?endDate=`. Returns `totalAmount`, `isAlreadyPaid`, `deposit`, `suggestedRefund`. |
| `GET` | `/rental/contracts/:id/refund` | `rentalOps.ts` → `loadRefundInfo()` | Fetches deposit refund record for a terminated contract. |
| `GET` | `/rental/contracts/:id/services` | Billing calculators | Lists services linked to contract via `contract_services` table. |
| `DELETE` | `/rental/contracts/:id` | `rentalOps.ts` → `deleteContract()` | Deletes a non-active contract. Returns error if status is `active` (must terminate first). Restores room to `vacant`. |

---

## 7. Invoices & Billing

**Route file**: `backend/src/routes/invoices.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/invoices` | Mobile invoices tab | Lists invoices. Filters: `?month=`, `?year=`, `?roomId=`, `?status=`, `?buildingId=`. Enriched with room/tenant names. |
| `POST` | `/invoices` | Mobile invoice creation | Creates invoice. Auto-calculates from contract services if `items` not provided. Rejects duplicates per `room_id + contract_id + month + year`. |
| `GET` | `/invoices/history/:contractId` | Invoice history view | Lists all invoices for a contract, sorted by date descending. |
| `GET` | `/invoices/previous-debt` | `rentalOps.ts` → `loadPreviousDebt()` | Calculates unpaid amount from prior billing period. Params: `?roomId=&month=&year=`. |
| `GET` | `/invoices/latest-meter-readings` | `rentalOps.ts` → `loadLatestReadings()` | Returns last `elec_new` and `water_new` for a room's active contract. Param: `?roomId=`. Falls back to contract's `electric_start` / `water_start`. |
| `GET` | `/invoices/:id` | `rentalOps.ts` → `loadInvoice()` | Full invoice detail with `items[]`, room info, tenant info, contract price. |
| `POST` | `/invoices/:id/mark-paid` | `rentalOps.ts` → `recordPayment()` step 2 | Marks invoice paid. Accepts `{ paidAmount, transactionId }`. Supports partial payments (status → `partial` if not fully paid). |
| `POST` | `/invoices/:id/collect-payment` | Mobile payment flow | **Combined single-step**: Creates transaction + marks invoice paid atomically. Accepts `{ walletId, amount?, date?, method?, note? }`. Rolls back transaction on failure. |
| `POST` | `/invoices/bulk-create` | `rentalOps.ts` → `bulkCreateInvoices()` | Batch invoice creation for multiple rooms. |
| `POST` | `/invoices/bulk-collect-payment` | `rentalOps.ts` → `bulkCollectPayment()` | Batch payment collection. Accepts `{ invoiceIds[], walletId }`. |
| `POST` | `/invoices/auto-generate` | — | Auto-generates draft invoices for all occupied rooms in a facility. Param in body: `{ buildingId, month, year }`. |
| `DELETE` | `/invoices/:id` | `rentalOps.ts` → `deleteInvoice()` | Deletes invoice + linked invoice_items + linked transaction (with wallet balance reversal). |

---

## 8. Financial Management — Transactions, Wallets & Categories

### 8.1 Transactions (Giao dịch Thu/Chi)

**Route file**: `backend/src/routes/transactions.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/transactions` | `rentalOps.ts` → `loadTransactions()` | Lists transactions. Filters: `?limit=`, `?contractId=`, `?type=` (`income`/`expense`), `?walletId=`. Enriched with wallet name and category info. |
| `POST` | `/transactions` | `rentalOps.ts` → `createTransaction()` | Creates income/expense transaction. Fields: `type`, `amount`, `description`, `wallet_id`, `category_id`, `date`, `image_uri`, `contract_id`, `invoice_id`. |
| `PATCH` | `/transactions/:id` | — | Updates a transaction's editable fields. |
| `DELETE` | `/transactions/:id` | `rentalOps.ts` → `deleteTransaction()` | Deletes transaction. **Reverses wallet balance** (adds back for expense, subtracts for income). |

### 8.2 Wallets (Ví / Nguồn tiền)

**Route file**: `backend/src/routes/wallets.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/wallets` | `rentalOps.ts` → `loadWallets()` | Lists all wallets (cash, bank, e-wallet). |
| `POST` | `/wallets` | `rentalOps.ts` → `createWallet()` | Creates a new wallet. Fields: `name`, `type` (`cash`/`bank`/`ewallet`), `initial_balance`. |
| `PATCH` | `/wallets/:id` | — | Updates wallet name, type, or metadata. |
| `GET` | `/wallets/:id/stats` | — | Returns wallet statistics: total income, total expense, current balance. |
| `DELETE` | `/wallets/:id` | `rentalOps.ts` → `deleteWallet()` | Deletes a wallet. |

### 8.3 Categories (Danh mục Thu/Chi)

**Route file**: `backend/src/routes/categories.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/categories` | Mobile transaction creation | Lists all transaction categories. Optional filter: `?type=` (`income`/`expense`). Returns `name`, `type`, `icon`, `color`. |
| `POST` | `/categories` | — | Creates a new category. Fields: `name`, `type`, `icon`, `color`. |
| `PATCH` | `/categories/:id` | — | Updates category details. |
| `DELETE` | `/categories/:id` | — | Deletes a category. |

---

## 9. Trading & Inventory (Kinh doanh hàng hóa)

**Route file**: `backend/src/routes/trading.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/trading/items` | `rentalOps.ts` → `loadTradingItems()` | Lists trading items. Filter: `?walletId=`. Enriched with batch statistics. |
| `GET` | `/trading/items/batch/:batchId` | — | Lists items within a specific batch. |
| `POST` | `/trading/items` | `rentalOps.ts` → `createTradingItem()` | Creates a trading item. Fields: `name`, `buy_price`, `sell_price`, `quantity`, `wallet_id`, `batch_id`. Creates expense transaction for purchase. |
| `PATCH` | `/trading/items/:id` | `rentalOps.ts` → `updateTradingItem()` | Updates item (e.g., mark as sold: `{ status: 'sold', sell_price, sold_date }`). Creates income transaction on sale. |
| `DELETE` | `/trading/items/:id` | `rentalOps.ts` → `deleteTradingItem()` | Deletes a trading item. |
| `GET` | `/trading/stats` | `rentalOps.ts` → `loadTradingStats()` | Returns trading statistics: total items, total investment, total revenue, profit/loss. Filter: `?walletId=`. |

---

## 10. Bank Configuration

**Route file**: `backend/src/routes/bankConfig.ts`

| Method | Endpoint | Mobile Caller | Description |
|---|---|---|---|
| `GET` | `/bank-config` | — | Retrieves owner's bank account configuration for QR code generation. |
| `PUT` | `/bank-config` | — | Creates or updates bank account config (account number, bank name, account holder). |

---

## 11. Public Guest Marketplace APIs

**Route file**: `backend/src/routes/public.ts`

| Method | Endpoint | Client Caller | Description |
|---|---|---|---|
| `GET` | `/public/boarding-houses` | Guest portal / Search | Lists publicly published boarding houses (`status=ACTIVE`, `isPublic=true`). |
| `GET` | `/public/boarding-houses/:id` | Guest portal / Detail | Facility detail panel with address, amenities, and reviews. |
| `GET` | `/public/rooms?bhId=:id` | Guest room browser | Available rooms within a boarding house (`status=AVAILABLE`, `isPublic=true`). |
| `POST` | `/public/leads` | Guest contact form | Creates a business lead (name, phone, email, message) in owner inbox. |
| `POST` | `/public/bookings` | Guest booking form | Sends a room reservation/hold request to the landlord. |

---

## 12. Communication & Admin Dashboard APIs

**Route files**: `backend/src/routes/owner.ts`, `backend/src/routes/admin.ts`

### 12.1 Owner Communication

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/owner/leads` | Lists guest contact submissions. |
| `GET` | `/owner/bookings` | Lists pending room hold requests. |
| `POST` | `/owner/bookings/:id/confirm` | Confirms a reservation request. |
| `POST` | `/owner/bookings/:id/reject` | Rejects a reservation request. |
| `GET` | `/owner/conversations` | Fetches owner inbox threads. |
| `GET` | `/owner/conversations/:id/messages` | Fetches sequential chat timeline. |
| `POST` | `/owner/conversations/:id/messages` | Dispatches owner reply message. |
| `GET` | `/owner/notifications` | Lists in-app notifications. |
| `GET` | `/owner/audit-logs` | Tracks landlord management audits. |

### 12.2 Super Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | Lists all users (Super-Admin only). |
| `PATCH` | `/admin/users/:id/status` | Bans or activates a user account. |
| `PATCH` | `/admin/users/:id/role` | Promotes or demotes user access level. |
| `GET` | `/admin/stats` | Platform-wide analytics and statistics. |
