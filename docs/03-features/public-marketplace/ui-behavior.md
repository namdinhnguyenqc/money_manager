# Public Marketplace — UI Behavior

## Public Listing Page (`/public/boarding-houses`)
- Displays boarding house cards: name, address, available room count, starting price.
- Location filter: 3 cascading dropdowns (Province → District → Ward).
- Empty state when no results match filters.

## Boarding House Detail Page (`/public/boarding-houses/:id`)
- Shows facility details: name, address, description, location.
- Lists available rooms with price and status.
- Lead form: guest name, phone, message.
- Booking form: date, preferred room type.

## Lead Form Component (`LeadForm.tsx`)
- Fields: guest name, guest phone, message.
- Submit creates lead via `POST /public/leads`.
- Success shows confirmation message.

## Owner Inbox
- Leads appear in `/owner/leads`.
- Bookings appear in `/owner/bookings` with confirm/reject actions.
- Messages appear in `/owner/conversations`.
