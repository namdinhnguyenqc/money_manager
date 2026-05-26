# Public Marketplace — Edge Cases

## 1. No Boarding Houses
- Empty state: show message "Không tìm thấy dãy trọ nào".

## 2. No Available Rooms
- Boarding houses with zero `AVAILABLE` rooms are hidden from the public list.

## 3. API Errors
- Display error banner with retry option. Fallback UI should be graceful.

## 4. Partial Location Filters
- Valid to filter by province only, or province + district without ward.
- Results are valid for any partial combination.

## 5. Lead Spam Prevention
- Current system has no rate limiting on lead submissions. Consider adding in Phase 2.

## 6. Production Schema Verification
- Production public lead creation uses `leads` table. Booking path uses `rental_*` tables.
- Needs production schema verification before deploying booking flow.
