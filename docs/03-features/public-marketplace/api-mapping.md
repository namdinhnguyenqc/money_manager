# Public Marketplace — API Mapping

## Public APIs (No Auth Required)

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/public/boarding-houses` | Public list page | Active/public facilities with available rooms. |
| `GET` | `/public/boarding-houses/:id` | Public detail page | Single facility detail. |
| `GET` | `/public/rooms?bhId=:id` | Public detail page | Public rooms in facility. |
| `POST` | `/public/leads` | `LeadForm` component | Creates guest lead/conversation/message. |
| `POST` | `/public/bookings` | Public detail booking form | Creates booking request + notification + audit. |

## Owner-Side APIs (Auth Required)

| Method | Endpoint | Notes |
|---|---|---|
| `GET` | `/owner/leads` | Owner's received leads list. |
| `GET` | `/owner/bookings` | Owner's booking requests. |
| `POST` | `/owner/bookings/:id/confirm` | Confirms a booking. |
| `POST` | `/owner/bookings/:id/reject` | Rejects a booking. |
| `GET` | `/owner/conversations` | Owner inbox (conversations from leads). |
| `GET` | `/owner/conversations/:id/messages` | Messages in a conversation. |
| `POST` | `/owner/conversations/:id/messages` | Owner reply to guest. |
| `GET` | `/owner/notifications` | Owner notifications. |

## Code Paths

| Layer | File |
|---|---|
| FE Public Pages | `web-admin/src/app/public/boarding-houses/page.tsx`, `[id]/page.tsx` |
| FE Lead Form | `web-admin/src/components/LeadForm.tsx` |
| BE Public Routes | `backend/src/routes/public.ts` |
| BE Owner Routes | `backend/src/routes/owner.ts` |
