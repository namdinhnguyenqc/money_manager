# Facility & Room Management — Rules

## Facility Rules
- Each facility (Boarding House) belongs to exactly one Owner (`owner_id`).
- Facility has a status: `ACTIVE` or `INACTIVE`.
- Facility has a visibility flag: `isPublic` (true/false).
- Only `ACTIVE` + `isPublic=true` facilities appear in the public marketplace.

## Room Rules
- Each Room belongs to exactly one Facility (`boarding_house_id`).
- Room statuses: `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`.
- Room inherits public visibility from its parent facility AND its own `isPublic` flag.
- Room creation always requires a facility context (auto-filled from navigation, never manually entered by the user).

## Room Status Transition Rules
| From | To | Trigger |
|---|---|---|
| `AVAILABLE` | `OCCUPIED` | Contract created for this room |
| `OCCUPIED` | `AVAILABLE` | Contract terminated or deleted |
| `AVAILABLE` | `MAINTENANCE` | Owner manually sets maintenance |
| `MAINTENANCE` | `AVAILABLE` | Owner manually clears maintenance |

## Data Constraints
- All IDs are UUID strings.
- Room `price` is numeric and represents the base monthly rent.
- Room `floor`, `area_m2`, and `max_tenants` are optional numeric fields (added by migration 021).
