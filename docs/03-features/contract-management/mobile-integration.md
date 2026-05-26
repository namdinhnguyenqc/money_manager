# Contract Management — Mobile Integration

## Shared API
Mobile clients use the same rental tenant, contract, and service APIs as the web frontend.

## Key Considerations
- Contract creation requires `room_id` and `facility_id` passed via navigation context — never manually entered.
- Tenant validation (phone 10 digits, CCCD 12 digits) should be replicated on mobile before API call.
- Contract termination with deposit refund triggers a wallet transaction — ensure wallet selection is available on mobile.

## Current Status
- No dedicated mobile contract management UI exists yet. The backend APIs are ready for integration.
