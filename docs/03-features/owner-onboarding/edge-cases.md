# Owner Onboarding — Edge Cases

## 1. Duplicate Phone Number
- **Trigger**: Owner submits profile with a phone number already used by another account.
- **Backend Response**: `409` with `code: "DUPLICATE_PHONE"` and `details.fieldErrors.phone`.
- **Expected FE Behavior**: Display error under phone field only. All other form fields (fullName, province, district, addressLine) must retain their values.

## 2. Invalid Google Token
- **Trigger**: Google ID token is expired, malformed, or has wrong audience.
- **Backend Response**: `401` with `code: "GOOGLE_TOKEN_INVALID"`.
- **Expected FE Behavior**: Show error message and allow retry.

## 3. Unverified Google Email
- **Trigger**: Google account's email is not verified (`email_verified = false`).
- **Backend Response**: `401` with `code: "GOOGLE_EMAIL_NOT_VERIFIED"`.
- **Expected FE Behavior**: Show error and suggest using a verified Google account.

## 4. Cookie/LocalStorage Drift
- **Trigger**: Developer manually edits cookies or localStorage, causing mismatch between stored auth state and actual server state.
- **Mitigation**: `OwnerWorkspaceShell.tsx` rechecks backend profile state (`/auth/me` + `/me/profile`) on mount and corrects cookie values.
- **Needs Verification**: Production browser behavior should be tested in a real session.

## 5. Concurrent Tab Sessions
- **Trigger**: Owner opens multiple tabs; completes profile in one tab.
- **Expected Behavior**: Other tabs will be corrected on next navigation or API call via the profile guard interceptor.

## 6. Profile Already Completed
- **Trigger**: Owner navigates to `/complete-profile` when profile is already done.
- **Expected FE Behavior**: Redirect to `/owner/dashboard` immediately.
