# API Governance & Standard Contracts

This document outlines the API guidelines, protocol standards, and error-handling mechanisms that govern communications between all client applications (web-admin, mobile) and the TrọCare Hono-based backend.

---

## 1. Protocol & Service Endpoints

All communications are conducted over **HTTPS** (or HTTP for local development) using structured **JSON** payloads.

### Base URLs
- **Local Backend Dev**: `http://localhost:8787`
- **Frontend Dev Port**: `http://localhost:3001`
- **API Environment Variable**: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8787` if not configured)

---

## 2. Authentication & Authorization Headers

Requests to protected resources must supply authorization credentials via HTTP headers.

| Header | Format / Example | Scope / Purpose |
|---|---|---|
| `Authorization` | `Bearer <JWT_ACCESS_TOKEN>` | Bearer token verifying user identity and claims. |
| `x-client-platform` | `web`, `ios`, `android` | Identifies client platform for telemetry and routing. |
| `x-idempotency-key` | `uuid-v4-string` | Required on sensitive mutations to prevent double execution. |

### Cookie-based Tokens
For standard web administration, the refresh token is stored inside a secure, `HttpOnly`, `SameSite=Lax` cookie (`refreshToken`), minimizing XSS exfiltration risks.

---

## 3. Global Response Wrappers

To ensure consistent ingestion across clients, the backend returns predictable response envelopes.

### Happy Path Response (Success)
All successful data-fetching operations wrap their payload inside a `data` root or return the resource directly.

```json
{
  "success": true,
  "data": {
    "id": "7607e1af-ba3e-479a-bee4-5493b6677c3a",
    "email": "owner@trocare.vn",
    "role": "OWNER"
  }
}
```

### Standard Error Response (Failure)
Failed requests must return an appropriate HTTP status code (4xx/5xx) and body following this pattern:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation.",
    "details": {}
  }
}
```

---

## 4. Custom Error Codes & Field Errors

The platform enforces semantic error reporting to allow clients to render input-specific errors dynamically.

### Core Error Matrix

| HTTP Status | Error Code | Description | UI Action |
|---|---|---|---|
| `400` | `BAD_REQUEST` | Query params or body values failed validation checks. | Highlight general error banner. |
| `400` | `VALIDATION_FAILED` | Zod validation failed on form inputs. | Distribute errors to corresponding inputs. |
| `401` | `UNAUTHORIZED` | Invalid, expired, or missing JWT access token. | Redirect to `/login/owner` or trigger refresh. |
| `403` | `PROFILE_REQUIRED` | Authenticated landlord has not finished profile verification. | Force redirect to `/complete-profile`. |
| `403` | `FORBIDDEN` | Valid session, but lacks permission to view/modify resource. | Display "Access Denied" view. |
| `409` | `DUPLICATE_PHONE` | Attempted profile completion with existing phone number. | Present validation error on the phone field. |
| `409` | `INVOICE_DUPLICATE` | Active invoice already exists for room/contract/month. | Prevent creation, show duplicate warning. |

### Zod Form Field Validation Failure Example
When input validation fails, individual field paths are returned:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed",
    "details": {
      "fieldErrors": {
        "phone": ["Vietnamese phone format is invalid. Must start with 0 or +84 and have 10-11 digits."],
        "idCard": ["CCCD must be exactly 12 digits."]
      }
    }
  }
}
```

---

## 5. Idempotency Handling

Mutations that perform financial postings (e.g., creating invoice payments, recording ledger transactions) MUST supply an `x-idempotency-key` header. 
- The backend caches the key in Redis/DB for **24 hours**.
- If a duplicate key is received, the backend immediately returns the previously cached response without re-executing the business logic.
