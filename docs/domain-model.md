# Domain Model

This document defines the business entities and invariants that AI agents should preserve when changing the code.

## Core Entity Groups

### Auth and Profile

| Entity | Current Source | Notes |
|---|---|---|
| User | JWT payload, `users` table/migration, mock auth objects | Roles include `USER`, `OWNER`, `ADMIN`, `SUPER_ADMIN`. |
| UserProfile | `mockDb.userProfiles`, `user_profiles` migration, `/me/profile` API | Required for OWNER/USER access to business modules. |
| SocialAccount | Migration exists | Google identity should use provider + provider_user_id, not email alone. Runtime Hono owner-google currently queries `users.google_id` or email in real mode. |
| Session | localStorage + cookies in FE, JWT in BE | FE middleware reads cookies; client service reads localStorage token. |

### Owner Facility and Public Listing

| Entity | Current Runtime Name | Meaning |
|---|---|---|
| BoardingHouse / Facility | `boarding_houses`, `mockOwnerState.boardingHouses` | Owner-managed physical facility/dãy trọ. |
| OwnerRoom | `rooms`, `mockOwnerState.rooms` | Owner-facing public/admin room record with `boardingHouseId`, `status`, `isPublic`. |
| PublicRoom | Derived from owner room | Public visible room if facility is active/public and room is public. |
| Lead | `leads`, `mockOwnerState.leads`, `rental_leads` for booking path | Guest contact intent. |
| Booking | `mockOwnerState.bookings`, `rental_bookings` in future/production path | Guest hold/request intent. |
| Conversation/Message | `mockOwnerState.conversations/messages`, `rental_conversations/messages` future schema | Owner guest communication. |

### Rental Operations

| Entity | Current Runtime Name | Meaning |
|---|---|---|
| RentalRoom | legacy `rooms`, `mockDb.rooms` | Operational room used for contracts/invoices. Status values are lowercase: `vacant`, `occupied`, `maintenance`. |
| Tenant | `tenants`, `mockDb.tenants` | Contract participant. Phone and CCCD have strict validation. |
| Contract | `contracts`, linked fields on mock room | Active/terminated relationship between tenant and room. |
| Service | `services`, `contract_services` | Electricity, water, wifi, trash, etc. |
| Invoice | `invoices`, `invoice_items` | Monthly bill with room fee, utility items, previous debt, paid amount, status. |
| Wallet | `wallets` | Payment destination for collected rent. |
| Transaction | `transactions` | Income/expense ledger; payment collection creates income transaction. |
| BankConfig | `bank_config` | QR/bank info used by billing/settings. |

### Trading and Legacy Finance

| Entity | Current Runtime Name | Meaning |
|---|---|---|
| TradingItem | `trading_items`, `mockDb.tradingItems` | Inventory item/batch for the older trading module. |
| Category | `categories` | Finance categories. |

## Status Vocabulary

### Room Status

| Layer | Values | Notes |
|---|---|---|
| Owner room | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE` | Used by `/owner/boarding-houses/:id/rooms`. |
| Rental room | `vacant`, `occupied`, `maintenance` | Used by `/rental/rooms` and FE rental ops. |
| UI normalized | `vacant`, `occupied`, `maintenance`, `expiring_soon`, `expired` | `normalizeRoomStatus()` maps backend values for display. |
| Future `rental_*` | `DRAFT`, `AVAILABLE`, `HELD`, `OCCUPIED`, `MAINTENANCE`, `HIDDEN`, `ARCHIVED` | Defined by migration 009. |

### Contract Status

| Value | Meaning |
|---|---|
| `active` | Contract currently occupies a room. |
| `expiring_soon` | UI-derived status when end date is within 30 days. |
| `ended` / `terminated` | Contract no longer active. Runtime uses `terminated` in backend and `ended` in UI status badge. |

### Invoice Status

| Runtime Value | UI Meaning |
|---|---|
| `draft` | Chưa gửi. |
| `unpaid` / `sent` | Đã gửi / chưa thu. |
| `overdue` | Quá hạn. |
| `paid` | Đã thanh toán. |
| partial paid amount | UI normalizes to `sent` unless backend status is `paid`/`overdue`/`draft`. |

## Invariants

1. **Owner profile is required** before owner/user can access business routes.
2. **Email is readonly** in profile flows. FE must not send email in profile update payload; BE should ignore or reject attempts to update email outside dedicated change-email flow.
3. **Phone uniqueness** for user profiles is enforced in current backend mock/profile store. Duplicate phone returns `DUPLICATE_PHONE` with `details.fieldErrors.phone`.
4. **Tenant identity validation** must reject invalid phone and CCCD before creating a contract:
   - phone: exactly 10 digits.
   - CCCD/idCard: exactly 12 digits.
5. **Contract creation changes room occupancy**:
   - In mock mode, `POST /rental/contracts` sets `mockDb.rooms[].status = occupied`.
   - Owner room bridge updates corresponding owner room to `OCCUPIED`.
6. **Contract termination frees room**:
   - Backend sets contract ended/terminated and room back to `vacant`.
7. **Invoice duplicates are blocked** for same room, contract, month, and year.
8. **Payment collection must create ledger state**:
   - Current FE creates a transaction, then marks invoice paid.
   - Do not mark invoice paid without preserving transaction linkage when collecting money.
9. **Facility context must be passed through URL/query** when creating room/contract/invoice/payment. Users should not manually enter `facility_id`, `room_id`, `contract_id`, or `invoice_id`.

## Current vs Future Data Model

### Current Runtime Model

The active runtime uses a hybrid model:

- Owner/public APIs use `boarding_houses` and `rooms`/`mockOwnerState`.
- Rental ops APIs use legacy tables `rooms`, `tenants`, `contracts`, `services`, `invoices`, `wallets`, `transactions`.
- In mock mode, `mockOwnerState.rooms[].rentalRoomId` bridges owner-facing rooms to rental ops rooms.

### Future Schema

Migration `009_phase1_room_rental_core.sql` introduces `rental_*` tables:

- `rental_buildings`
- `rental_building_staff`
- `rental_rooms`
- `rental_room_availability`
- `rental_room_media`
- `rental_leads`
- `rental_bookings`
- `rental_conversations`
- `rental_messages`
- `rental_utility_meters`
- `rental_meter_records`
- `rental_notifications`
- `rental_outbox_events`
- `rental_idempotency_keys`
- `rental_audit_logs`

### Needs verification

Runtime APIs are not fully migrated to `rental_*` tables. Agents should not assume the future schema is active for owner ops unless the task explicitly asks to migrate runtime APIs and tests are added.
