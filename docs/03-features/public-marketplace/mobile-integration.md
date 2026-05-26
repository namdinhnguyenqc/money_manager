# Public Marketplace — Mobile Integration

## Shared API
Mobile guests use the same public APIs. No authentication required for browsing.

## Key Considerations
- Location filter cascade (Province → District → Ward) should use the same `/locations/provinces` and `/locations/districts` endpoints.
- Lead submission from mobile sends the same payload as web.
- Booking requests work identically across platforms.

## Current Status
- Public API is ready for mobile guest browsing. No dedicated mobile app yet.
