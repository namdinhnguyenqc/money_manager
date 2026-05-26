# Core Business Rules & Invariants

This document codifies the non-negotiable business rules and database invariants of the TrọCare platform. Developers and AI agents must preserve these behaviors in all updates.

## 1. Onboarding & Profile Completion Invariants
- **Mandatory Onboarding**: Every user registering via Google or password credentials with the `OWNER` role must complete their profile before accessing functional features.
- **Readonly Email**: A user's email address is established strictly via Google authentication or verified email registration. It is **Readonly** and cannot be altered during onboarding, profile page views, or profile settings updates.
- **Onboarding States**:
  - `COMPLETE_PROFILE`: Onboarding is incomplete; user profile forms are required.
  - `DONE`: Onboarding is complete; standard workspace navigation is enabled.
- **Phone Uniqueness**: Profiles require a phone number. In the case of duplicate phone numbers, the server returns a specific field error mapped to the phone field. The UI must preserve all other input data on validation failure and not reset the form.

## 2. Rental Operations Invariants
- **Context ID URL Requirements**: Context IDs (e.g., `facility_id`, `room_id`, `contract_id`, `invoice_id`) must always be passed dynamically via route parameters or query strings (e.g., `/contracts/new?room_id=...&facility_id=...`). The user must never be prompted to manually type or copy-paste these IDs.
- **ID Type Standard**: All entity IDs are strings formatted as UUIDs. Never use numeric casts (`Number(id)`) for ID operations or comparisons.
- **Tenant Validation Rules**: Before a Contract is initialized, the associated Tenant's identity must pass validation:
  - Phone: Exactly 10 digits.
  - ID Card (CCCD): Exactly 12 digits.
  - Email: Valid email format if provided (nullable).

## 3. Contract & Room Lifecycle Invariants
- **Occupancy Transition**:
  - Activating/creating a Contract automatically transitions the target Room status to `OCCUPIED`.
  - Terminating a Contract automatically frees the Room, setting its status back to `AVAILABLE`.
- **Billing Cycle Day**: Billing day constraints must fall between 1 and 28 to avoid monthly drift (e.g., handling February limits).
- **Termination Settlements**: Terminating a contract allows an optional deposit refund. This action must trigger a linked ledger transaction if a refund is processed.

## 4. Invoice & Payment Invariants
- **Duplicate Prevention**: The system must reject duplicate monthly invoices. Only one invoice is allowed per `room_id`, `contract_id`, `month`, and `year`.
- **Payment Ledger Linkage**: Recording a payment is a two-step transaction:
  1. A transaction record is created under `transactions` mapping the income to a specified wallet.
  2. The invoice is marked as paid, binding the created transaction's ID (`transaction_id`) to the invoice record.
  - Both steps must succeed to ensure the ledger matches invoice status. Do not bypass or consolidate these steps without updating the ledger balance calculation.
- **Calculations**:
  - Invoice total = `Room Rent` + `Utilities` + `Extra Fees` - `Discount`.
  - Utility Cost = (Current Meter Reading - Previous Meter Reading) * Unit Price.
  - The system must retrieve the latest meter readings as a baseline for new invoice forms.

## 5. Public Marketplace Invariants
- **Public Visibility Criteria**: An entity is visible in the public marketplace if and only if:
  - Boarding House: `status = ACTIVE` and `isPublic = true`.
  - Room: `status = AVAILABLE`, `isPublic = true`, and its parent Boarding House is published.
- **Occupancy Auto-Hide**: If a Room's status changes to `OCCUPIED`, it must automatically be hidden from public marketplace lists.
