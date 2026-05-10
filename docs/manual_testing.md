Manual Testing Guide (RBAC MVP)

Overview
- This guide describes how to manually verify core MVP flows for Guest, Owner, and Super Admin roles.
- Playwright end-to-end tests are present as scaffolding but are not required to run automatically per the current instruction; this document helps QA run tests manually or with integration test helpers.

Prerequisites
- Node.js and npm/yarn installed
- Access to the web-admin app running locally (Next.js) at http://localhost:3001
- Optional: Postman or curl to call API endpoints directly (for manual API verification)

1) Roles and access

2) Public Guest Portal (Guest flow)
- Public pages exist to list BHs and view room details. Guest can submit a Lead via the LeadForm (public path).
- Manual verification steps:
  - Open http://localhost:3001/public/boarding-houses
  - Confirm a list of BHs is visible, with a search input to filter by name
  - Click into a BH and verify public room details display
  - Submit a Lead using LeadForm on a BH detail page

3) Owner Flow (core MVP verification)
- Logging in with OWNER role to access Owner UI
- Navigate to /owner/boarding-houses
- Create or edit a BH, and publish/unpublish
- Open BH details to verify fields, extraFields, and KPI cards
- Go to BH/rooms to verify RoomEditModal editing
- Navigate to BH/leads to verify lead listing
- Open Owner Dashboard and verify KPI display

4) Super Admin Flow (basic checks)
- Access /super-admin/users and /super-admin/reports (UI skeletons)
- Verify user list rendering and simple reports display

5) Public API checks (manual, curl can be used)
- Public BHs: GET /public/boarding-houses
- Public BH detail: GET /public/boarding-houses/{bhId}
- Public Rooms: GET /public/rooms?bhId={bhId}
- Lead creation: POST /public/leads
- Auth endpoints: POST /auth/login, POST /auth/logout

6) Post-conditions and data integrity
- Ensure RBAC redirects happen correctly when token or role is missing/invalid
- Validate that KPI card numbers update after BH/Room edits
- Validate that Not Authorized page appears for non-OWNER roles on /owner routes

7) Optional - Integration tests (manual)
- Create a small collection of API calls and verify responses with a tool like Postman
- Capture screenshots of each step for QA artifacts

8) Acceptance criteria (quick checklist)
- Guest can search and submit a lead
- Owner can manage BH and Rooms and publish/unpublish BH
- KPI cards reflect data from backend for BH and dashboard (fallbacks in place)
- Not Authorized guards redirect correctly for invalid access
- Not relying on Playwright in CI (manual E2E is acceptable for now)

9) Notes
- If you want to add more test cases or adjust flows, update this doc to reflect the changes.
