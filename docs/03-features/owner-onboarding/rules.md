# Owner Onboarding — Validation Rules

## Profile Completion Fields

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | Text | Yes | Min 2 characters |
| `phone` | Text | Yes | Vietnamese phone format (`/^(0|\+84)[0-9]{9,10}$/`). Must be unique across all profiles. |
| `provinceCode` | Text | Yes | Valid province code from `/locations/provinces` |
| `provinceName` | Text | Yes | Matching province name |
| `districtCode` | Text | Yes | Valid district code from `/locations/districts?provinceCode=...` |
| `districtName` | Text | Yes | Matching district name |
| `addressLine` | Text | Yes | Min 5 characters |

## Computed Fields
- `fullAddress`: Automatically built server-side as `addressLine, districtName, provinceName`.

## Immutable Fields (Readonly)
- `email`: Inherited from Google OAuth or verified email registration. Cannot be altered in any profile form.
- `role`: Set at registration time. Cannot be changed by the user themselves.
- `authProvider`: System-assigned based on registration method.

## Error Handling
- **Duplicate Phone (`409 DUPLICATE_PHONE`)**: Server returns field-level error `details.fieldErrors.phone`. The UI must display the error message under the phone field only and **must not reset** other form field values.
- **Validation Error (`400`)**: Server returns Zod-based validation error with a map of field-level error messages.
