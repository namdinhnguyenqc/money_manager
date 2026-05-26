# Owner Onboarding — Mobile Integration

## Google Auth Payload Differences

Mobile clients send additional fields alongside the Google `idToken`:

```json
{
  "idToken": "GOOGLE_ID_TOKEN",
  "platform": "ios",
  "deviceId": "optional-device-id",
  "fcmToken": "optional-fcm-token"
}
```

Web clients use a simplified payload:

```json
{
  "idToken": "GOOGLE_ID_TOKEN",
  "platform": "web"
}
```

## Mobile Onboarding Flow
The mobile onboarding flow is identical to web:
1. Authenticate via `POST /auth/owner-google`.
2. Check `nextStep` in response.
3. If `COMPLETE_PROFILE`, navigate to profile completion screen.
4. Submit profile via `POST /me/profile/complete`.
5. On success, navigate to owner dashboard.

## Push Notification Registration
- Mobile clients may optionally send `fcmToken` during authentication for push notification enrollment.
- The backend stores this token for future notification delivery (Phase 2+).

## Current Status
- Mobile integration uses the same shared backend API as the web frontend.
- No separate mobile-specific endpoints exist.
