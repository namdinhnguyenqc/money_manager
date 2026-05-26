# Facility & Room Management — UI Behavior

## Facility List Page (`/facilities`)
- Displays facility cards with summary metrics: total rooms, vacant, occupied, maintenance.
- Each card is clickable and navigates to facility detail.
- "Thêm dãy trọ" button opens facility creation form.

## Facility Detail Page (`/facilities/:id`)
- Shows facility information header (name, address, status).
- Displays room grid/list with:
  - Room number, floor, area, price.
  - Status badge (color-coded: green=available, red=occupied, yellow=maintenance).
  - Tenant name if occupied.
- Vacant room cards expose a "Tạo hợp đồng" (Create Contract) action button.
- "Thêm phòng" button opens room creation form with facility context pre-filled.

## Room Status Badge Colors
| Status | Color | Label |
|---|---|---|
| AVAILABLE | Green | Trống |
| OCCUPIED | Red | Đang thuê |
| MAINTENANCE | Yellow/Orange | Bảo trì |

## Testing Coverage
- **E2E**: `owner-rental-billing-flow.spec.ts` covers facility creation and room management.
