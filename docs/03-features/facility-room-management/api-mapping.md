# Facility & Room Management — API Mapping

## Owner Facility APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/owner/boarding-houses` | `loadBoardingHouses()` | List owner's facilities. |
| `POST` | `/owner/boarding-houses` | `createBoardingHouse()` | Create new facility. |
| `GET` | `/owner/boarding-houses/:id` | `loadBoardingHouse()` | Facility detail. |
| `PATCH` | `/owner/boarding-houses/:id` | `updateBoardingHouse()` | Update facility fields. |
| `DELETE` | `/owner/boarding-houses/:id` | `deleteBoardingHouse()` | Delete facility. |

## Owner Room APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/owner/boarding-houses/:id/rooms` | `loadOwnerRooms()` | List rooms under a facility. |
| `POST` | `/owner/boarding-houses/:id/rooms` | `createOwnerRoom()` | Create room under facility. |
| `PATCH` | `/owner/rooms/:id` | `updateRoom()` | Update room by owner-room ID. |
| `DELETE` | `/owner/rooms/:id` | Owner pages | Delete owner room. |

## Rental Room APIs (Operational View)

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/rental/rooms?buildingId=...` | `loadRentalRooms()` | Operational room list enriched with invoice and tenant data. |
| `POST` | `/rental/rooms` | Internal | Legacy/internal room create. |
| `DELETE` | `/rental/rooms/:id` | `deleteRoom()` | Delete rental room; blocked if active contract exists. |

## Code Paths

| Layer | File |
|---|---|
| FE Facility Pages | `web-admin/src/app/(owner-ops)/facilities/page.tsx`, `facilities/[id]/page.tsx` |
| FE Service | `web-admin/src/lib/rentalOps.ts` |
| BE Owner Routes | `backend/src/routes/owner.ts` |
| BE Rental Routes | `backend/src/routes/rental.ts` |
