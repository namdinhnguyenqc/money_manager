# Contract Management — Rules

## Tenant Validation (Pre-Contract)

| Field | Rule | Error Behavior |
|---|---|---|
| `phone` | Exactly 10 digits | Block form submission, show inline error |
| `idCard` (CCCD) | Exactly 12 digits | Block form submission, show inline error |
| `email` | Valid format if provided | Optional field, validate only when non-empty |
| `fullName` | Required, non-empty | Block form submission |

Validation is performed client-side in `rentalOps.ts` before the API call. Backend also validates with Zod.

## Contract Constraints

- **Billing Day**: Must be between 1 and 28 (avoids month-end edge cases).
- **Room Occupancy**: Creating a contract automatically sets room status to `OCCUPIED`.
- **Unique Active Contract**: Only one active contract per room at a time.
- **Services Binding**: Contract can bind to utility services (electricity, water, internet, etc.) with per-contract pricing.

## Termination Rules

- Terminating a contract frees the room (`AVAILABLE`).
- Optional deposit refund creates a linked ledger transaction.
- Terminated contracts remain in the database for historical reference.

## Delete Rules

- Deleting a contract also frees the associated room.
- Deletion is a hard delete (removes the contract record).
