# Facility & Room Management — Mobile Integration

## Shared API
Mobile clients use the same owner and rental room APIs as the web frontend. No separate mobile-specific endpoints exist.

## Key Considerations
- Room creation payloads are identical across web and mobile.
- Facility context (`boarding_house_id`) must always be passed in the URL path, never manually entered by the user.
- Mobile should pre-load the facility list to allow drill-down navigation into rooms.

## Current Status
- Mobile integration is planned but not yet actively developed as a separate app.
- The backend API is designed to support both web and mobile clients through the same routes.
