# Facility & Room Management — Edge Cases

## 1. Dual Room System (Owner Rooms vs. Rental Rooms)
- **Context**: The system currently maintains two room representations:
  - **Owner Room**: Created via `/owner/boarding-houses/:id/rooms`. Represents the property listing.
  - **Rental Room**: Created/linked via `/rental/rooms`. Represents the operational view enriched with contract, tenant, and invoice data.
- **Mock State Bridge**: In local/mock mode, `mockOwnerState.rooms[].rentalRoomId` links an owner room to `mockDb.rooms[]`.
- **Risk**: IDs differ between the two systems. When calling `PATCH /owner/rooms/:id` vs `PATCH /rental/rooms/:id`, ensure the correct ID type is used.
- **Future**: Migration to `rental_*` unified schema will eliminate this duality.

## 2. Delete Room with Active Contract
- Attempting to delete a rental room that has an active contract returns an error.
- The owner must terminate or delete the contract before the room can be removed.

## 3. Facility with Zero Rooms
- Facility cards should display zero counts gracefully (e.g., "0 phòng").
- Facility detail should show an empty state encouraging room creation.

## 4. Room Count Aggregation
- Facility cards show: total rooms, vacant, occupied, maintenance.
- These counts are calculated from the room list response, not a separate API.
