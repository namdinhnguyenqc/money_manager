# Public Marketplace — Rules

## Public Visibility
- Boarding House visible if: `status = ACTIVE` AND `isPublic = true`.
- Room visible if: `status = AVAILABLE` AND `isPublic = true` AND parent boarding house is visible.
- Boarding houses with zero available rooms are hidden from public lists.

## Lead Rules
- Guest does not need authentication to submit a lead.
- Lead creates a conversation + message for the owner to view.
- Lead statuses: `NEW`, `CONTACTED`, `BOOKED`, `CANCELLED`.

## Booking Rules
- Guest can submit a booking request from a boarding house detail page.
- Booking creates a notification and audit log entry for the owner.
- Owner can confirm or reject bookings from `/owner/bookings`.
- Current hold logic checks active bookings in the database.

## Location Filtering
- Three cascading dropdowns: Province → District → Ward.
- Province loads on page entry. District loads after province selection. Ward loads after district selection.
- Partial filters are supported (e.g., province only without district/ward).
- No filter selected → show all public boarding houses.
