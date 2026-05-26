# Developer Testing Guidelines

This document outlines the testing strategy, tools, and workflows for verifying the reliability of the TrọCare application.

---

## 1. Testing Strategy & Frameworks

TrọCare adopts a multi-tiered testing strategy to verify backend business logic, validation rules, and frontend user flows.

```
       ▲  [Playwright] End-to-End E2E Flows (Critical paths, Role boundaries)
      ╱ ╲
     ╱   ╲  [Vitest / Supertest] API Integration Tests (Validation, Response envelopes)
    ╱     ╲
   ╱       ╲  [Vitest] Unit Tests (Helper functions, Utility calculations, Zod validators)
  ───────────
```

### Core Testing Frameworks
- **Backend Unit & Integration Testing**: Powered by **Vitest**. Tests run against mock and Supabase databases to verify endpoints, middlewares, and data constraints.
- **Frontend E2E Testing**: Structured using **Playwright**. Validates user interactions, form submissions, and authentication state guards in standard browsers.

---

## 2. Running Automated Tests

Developers must run the relevant test suites when introducing modifications to active paths.

### Running Backend API & Unit Tests
To execute backend logic tests:
```bash
cd backend
npm run test
```
To run tests in watch mode during development:
```bash
npm run test:watch
```

### Running Frontend Tests
To execute frontend-specific validation and rendering tests:
```bash
cd web-admin
npm run test
```

---

## 3. Form Validation & Data Integrity Verification

Our API endpoints enforce strict Zod validation rules at input boundaries. Developers must verify validation and error states by writing regression tests:

### Example: Tenant Phone & CCCD Constraint Verification
When writing integration tests for tenant registration, developers must verify that invalid input formats (e.g., short phone numbers or incorrect CCCD identifiers) are rejected with a `400 Bad Request` status and structural validation error messages:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Tenant Onboarding Integrity Checks', () => {
  it('should reject tenant registration if phone or CCCD formatting is invalid', async () => {
    const res = await request(app.callback())
      .post('/rental/tenants')
      .set('Authorization', 'Bearer VALID_OWNER_TOKEN')
      .send({
        fullName: 'Nguyen Van A',
        phone: '123',          // Invalid phone
        idCard: '9999'         // Invalid CCCD
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.fieldErrors).toHaveProperty('phone');
    expect(res.body.error.details.fieldErrors).toHaveProperty('idCard');
  });
});
```

---

## 4. Manual QA Walkthrough Checklists

For manual testing, developers can follow these checklists to verify critical platform flows.

### A. Public Guest Portal Flow
1. **Browse Facilities**: Navigate to `http://localhost:3001/public/boarding-houses`. Verify that the page loads a list of public boarding houses and filters items correctly using the search bar.
2. **View Room Details**: Click on a boarding house card. Verify that public room lists display with accurate monthly rent prices and square footage.
3. **Submit Guest Lead**: Fill out the public contact form (`LeadForm`) with a guest name, phone number, and message. Verify that the submission triggers a success notification.

### B. Landlord Profile & Onboarding Flow
1. **Sign-In Action**: Click the "Landlord Sign In" button on `/login/owner` and authenticate using Google OAuth credentials.
2. **Onboarding Check**: Verify that the application detects incomplete profiles and redirects users to `/complete-profile`.
3. **Profile Validation Error Handling**: Try to submit the form using a phone number that is already registered. Verify that the form preserves user-entered data and displays a `409 Duplicate Phone` error next to the phone input field.
4. **Onboarding Success**: Submit the form with valid, unique profile details. Verify that the application redirects you to `/owner/dashboard`.

### C. Admin & RBAC Guards
1. **Unauthorized Access**: Attempt to navigate directly to `/owner/dashboard` or `/admin/users` from an unauthenticated browser window. Verify that the application redirects you to the appropriate login page.
2. **Role Boundaries**: Log in using a standard `OWNER` account and attempt to access `/super-admin/users`. Verify that the application blocks access and displays a "Not Authorized" message.
