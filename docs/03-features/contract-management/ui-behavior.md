# Contract Management — UI Behavior

## Contract Creation Page (`/contracts/new?room_id=:id&facility_id=:fid`)

### URL Context Requirements
- `room_id` and `facility_id` must be present in query string. These are auto-populated from the room card "Tạo hợp đồng" action.
- User must never manually type or paste IDs.

### Form Sections
1. **Room Info**: Auto-loaded and displayed as readonly context.
2. **Tenant Identity**: fullName, phone (10 digits), idCard/CCCD (12 digits), email (optional).
3. **Contract Details**: deposit amount, monthly rent, billing day (1-28), start date, end date.
4. **Services**: Select utility services and set per-contract pricing.

### Validation Feedback
- Invalid tenant fields show inline errors below each field.
- Form submit button is disabled until all required fields pass validation.

## Contract Detail Page (`/contracts/:id`)
- Displays contract summary: tenant info, room, rent, deposit, dates, services.
- Action buttons: "Tạo hóa đơn tháng này", "Kết thúc hợp đồng", "Xóa hợp đồng".
- Shows linked invoices list.

## Testing Coverage
- **E2E**: `owner-rental-billing-flow.spec.ts` covers contract creation from vacant room.
- **Unit**: `rentalOps.validation.test.tsx` covers tenant validation helpers.
