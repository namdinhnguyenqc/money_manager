# Contract Management — Edge Cases

## 1. Invalid Tenant Identity
- **Trigger**: Owner enters phone with fewer/more than 10 digits, or CCCD with non-12 digits.
- **Behavior**: FE blocks form progression with inline validation error. API call is not made.

## 2. Room Already Occupied
- **Trigger**: Attempting to create a contract for a room that already has an active contract.
- **Behavior**: Backend rejects with an error. FE should show error and prevent double-contract creation.

## 3. Contract Delete vs. Terminate
- **Delete**: Hard-removes the contract record. Used for erroneous/draft contracts.
- **Terminate**: Soft-ends the contract, preserving it for historical reference. Supports deposit refund.
- **Both**: Free the associated room back to `AVAILABLE`.

## 4. Deposit Refund on Termination
- If deposit refund is requested during termination, the backend creates a ledger transaction linked to a wallet.
- If no wallet is specified, the refund transaction may fail or default to the owner's primary wallet.

## 5. Services Pricing Override
- Contract-level services can have per-contract pricing that differs from the default service price.
- Invoice generation uses the contract-bound service price, not the global service price.
