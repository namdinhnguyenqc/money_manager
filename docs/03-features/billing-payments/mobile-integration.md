# Billing & Payments — Mobile Integration

## Shared API
Mobile clients use the same invoice, transaction, and wallet APIs. No mobile-specific endpoints.

## Key Considerations
- Invoice creation requires `contract_id` passed via navigation context.
- Payment recording requires wallet selection — mobile must load wallets beforehand.
- Meter reading inputs should support numeric keyboards on mobile.

## Current Status
- Backend APIs are ready for mobile integration. No dedicated mobile billing UI yet.
