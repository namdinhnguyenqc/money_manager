# Public Marketplace — State Machine

## Lead Status
```mermaid
stateDiagram-v2
  [*] --> NEW : Guest submits lead
  NEW --> CONTACTED : Owner contacts guest
  CONTACTED --> BOOKED : Confirmed booking
  NEW --> CANCELLED : Owner/guest cancels
  CONTACTED --> CANCELLED : Owner/guest cancels
```

## Booking Status
```mermaid
stateDiagram-v2
  [*] --> PENDING : Guest submits booking
  PENDING --> CONFIRMED : Owner confirms (POST /owner/bookings/:id/confirm)
  PENDING --> REJECTED : Owner rejects (POST /owner/bookings/:id/reject)
```
