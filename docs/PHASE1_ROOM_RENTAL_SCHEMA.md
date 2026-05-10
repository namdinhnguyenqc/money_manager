# Phase 1 Room Rental Schema

Mục tiêu của phase này là dựng **domain phòng trọ chuẩn** để tách khỏi app tài chính nội bộ hiện tại. Đây là baseline cho các phase BE/FE tiếp theo.

## Bảng cần có

### Core identity

- `users`
- `landlord_profiles`
- `tenant_profiles`

### Building / inventory

- `buildings`
- `building_staff`
- `rooms`
- `room_availability`
- `room_media`

### Booking / lead / messaging

- `leads`
- `bookings`
- `conversations`
- `conversation_participants`
- `messages`

### Utilities / billing

- `utility_meters`
- `meter_records`
- `invoices`
- `invoice_items`

### Platform

- `notifications`
- `outbox_events`
- `idempotency_keys`
- `audit_logs`

## Tối thiểu mỗi bảng

### `buildings`

- `id uuid pk`
- `owner_id uuid fk -> users.id`
- `name text`
- `address_text text`
- `province_code text`
- `district_code text`
- `ward_code text`
- `lat double precision`
- `lng double precision`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `building_staff`

- `id uuid pk`
- `building_id uuid fk`
- `user_id uuid fk`
- `role_in_building text`
- `permissions jsonb`
- `unique(building_id, user_id)`

### `rooms`

- `id uuid pk`
- `building_id uuid fk`
- `code text`
- `title text`
- `description text`
- `monthly_rent numeric`
- `deposit_amount numeric`
- `area_m2 numeric`
- `amenities jsonb`
- `electricity_price numeric`
- `water_price numeric`
- `internet_fee numeric`
- `service_fee numeric`
- `current_status text`
- `is_public boolean`
- `search_text generated/stored`
- `created_at timestamptz`
- `updated_at timestamptz`
- `unique(building_id, code)`

### `room_availability`

- `room_id uuid pk fk -> rooms.id`
- `is_available boolean`
- `available_from date`
- `active_booking_id uuid null`
- `version int`
- `updated_at timestamptz`

### `leads`

- `id uuid pk`
- `room_id uuid fk`
- `building_id uuid fk`
- `guest_name text`
- `guest_phone text`
- `guest_email text`
- `message text`
- `status text`
- `created_at timestamptz`

### `bookings`

- `id uuid pk`
- `room_id uuid fk`
- `tenant_user_id uuid fk`
- `booking_mode text`
- `status text`
- `desired_move_in date`
- `lease_months int`
- `message text`
- `expires_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### `conversations`

- `id uuid pk`
- `booking_id uuid null fk`
- `room_id uuid null fk`
- `topic text`
- `created_at timestamptz`

### `conversation_participants`

- `conversation_id uuid fk`
- `user_id uuid fk`
- `joined_at timestamptz`
- `pk(conversation_id, user_id)`

### `messages`

- `id uuid pk`
- `conversation_id uuid fk`
- `sender_user_id uuid fk`
- `client_message_id text null`
- `body text`
- `sent_at timestamptz`
- unique dedup trên `(conversation_id, sender_user_id, client_message_id)`

### `utility_meters`

- `id uuid pk`
- `room_id uuid fk`
- `meter_type text`
- `meter_code text`
- `unit text`
- `active boolean`
- `unique(room_id, meter_type)`

### `meter_records`

- `id uuid pk`
- `meter_id uuid fk`
- `recorded_at timestamptz`
- `reading_value numeric`
- `image_url text`
- `note text`
- `recorded_by uuid fk`
- `unique(meter_id, recorded_at)`

### `notifications`

- `id uuid pk`
- `user_id uuid fk`
- `channel text`
- `event_type text`
- `payload jsonb`
- `delivered_at timestamptz`
- `read_at timestamptz`
- `created_at timestamptz`

### `outbox_events`

- `id bigserial pk`
- `aggregate_type text`
- `aggregate_id uuid`
- `event_type text`
- `payload jsonb`
- `created_at timestamptz`
- `published_at timestamptz null`

### `idempotency_keys`

- `key text pk`
- `user_id uuid fk`
- `route text`
- `request_hash text`
- `response_code int`
- `response_body jsonb`
- `created_at timestamptz`
- `expires_at timestamptz`

## Ràng buộc bắt buộc

- `uq_room_single_active_booking`:
  unique partial index trên `bookings(room_id)` với các trạng thái `hold`, `confirmed`, `checked_in`

- `room_availability.version`:
  mọi mutation booking/publish/unpublish phải tăng version

- `rooms.search_text`:
  generated column để chuẩn bị cho `unaccent + pg_trgm`

## Index bắt buộc

- `idx_buildings_owner_id`
- `idx_buildings_location`
- `idx_rooms_building_status`
- `idx_rooms_public_status`
- `idx_rooms_search_trgm`
- `idx_rooms_amenities_gin`
- `idx_room_availability_version`
- `idx_bookings_room_status`
- `idx_outbox_unpublished`
- `idx_notifications_user_created_at`

## Chưa cần ở phase 1

- recommendation personalization
- web push tokens
- moderation score
- data export jobs
- full RLS rollout

## Sau phase 1

1. Viết migration SQL thật cho các bảng trên
2. Refactor owner/admin routes sang schema mới
3. Thêm public search APIs
4. Thêm booking/contact/messaging APIs
5. Thêm SSE/WebSocket/outbox worker
