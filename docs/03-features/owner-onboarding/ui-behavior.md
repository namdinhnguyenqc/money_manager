# Owner Onboarding — UI Behavior

## Complete Profile Page (`/complete-profile`)

### Form Layout
| Field | Component | Behavior |
|---|---|---|
| Email | Input (disabled) | Readonly. Populated from `user.email`. Gray/dimmed visual state. |
| Full Name | Text Input | Required. Pre-populated from Google `name` if available. |
| Phone | Text Input | Required. Validates `10 digits`. Field error displays under this input on duplicate. |
| Province | Select Dropdown | Required. Loads options from `GET /locations/provinces`. |
| District | Select Dropdown | Required. Cascading: loads from `GET /locations/districts?provinceCode=...` after province selection. |
| Address Line | Textarea/Input | Required. Min 5 chars. |
| Submit Button | Button | Disabled when form is invalid. |

### Field Error Preservation
When the server returns a field-level error (e.g., duplicate phone), the form must:
1. Display the error message adjacent to the specific field.
2. Retain all other field values as entered by the user.
3. Not trigger a page reload or form reset.

### Profile Settings Page (`/owner/settings/profile`)
- Same form layout as Complete Profile, with the following differences:
  - Pre-populated with existing profile data from `GET /me/profile`.
  - Uses `PUT /me/profile` for submission instead of `POST /me/profile/complete`.
  - Email remains disabled/readonly.
  - Success shows toast: "Cập nhật hồ sơ thành công".

### Profile View Page (`/owner/profile`)
- Display-only page showing: Avatar, Full Name, Email, Phone, Full Address, Role, and Auth Provider.
- Contains a link/button to navigate to Profile Settings.

## Testing Coverage
- **Unit**: `web-admin/__tests__/ProfileFormCard.test.tsx` — validates field error preservation and form state management.
- **E2E**: `web-admin/tests/e2e/owner-profile-onboarding.spec.ts` — end-to-end onboarding flow.
