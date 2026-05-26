# The TrọCare Engineering Constitution

This constitution establishes the coding conventions, directory structures, architectural patterns, and performance limits for the TrọCare codebase. All developers and AI coding agents must comply with these guidelines.

---

## 1. Directory Conventions & Active Modules

The codebase is structured as a monorepo containing distinct operational environments. Legacy modules are kept strictly separate.

```
money_manager/ (Root)
├── backend/                  <-- Active Node/Hono server
│   ├── src/
│   │   ├── index.ts          <-- Active backend entrypoint
│   │   ├── routes/           <-- Route handlers (auth, owner, public)
│   │   └── migrations/       <-- DB migrations scripts (001-022)
├── web-admin/                <-- Active Next.js frontend web administration
│   ├── src/
│   │   ├── app/              <-- App Router pages (owner, admin, public)
│   │   ├── components/       <-- Shared React elements (UI, forms)
│   │   └── lib/              <-- Client services (apiClient, rentalOps)
├── docs/                     <-- Canonical developer documentation
└── money-manager/            <-- [LEGACY] Reference-only mobile/financial portal
```

---

## 2. General Code Quality Rules

### Type Safety & Validation
- **Zero Typescript Compiler Errors**: The compilation command `tsc --noEmit` must pass without warnings across all projects before merging.
- **Strict Runtime Validation**: Ad-hoc validations are prohibited. All input boundaries (HTTP request body, query arguments) must be parsed using **Zod schema validators** matching backend structures.
- **Unified TypeScript Contracts**: Shared interfaces (e.g., room shapes, billing details) must be aligned between frontend clients and backend responses.

### Code Style
- Use standard ES6 syntax and asynchronous code (`async/await`) instead of raw Promises.
- Keep components focused and modular. UI elements in `web-admin` must use clean layouts matching the system design tokens.

---

## 3. Strict Security Rules

All features must comply with the system security posture:

- **Row-Level Partitioning**: Backend routes must enforce strict isolation boundaries by incorporating user session identifiers (`auth.uid()`) inside queries. Landlords must never access records belonging to other landlords.
- **Mandatory Profile Guards**: Access to owner-facing operations requires a fully completed and verified profile. If a landlord's profile is incomplete, the API must return a `403 PROFILE_REQUIRED` error, and the client must redirect the user to `/complete-profile`.
- **Sensitive Attribute Readonly Status**: User registration emails are set at sign-up via Google OAuth and are strictly read-only. Profile updates must not permit modifications to the email address.
- **Form Sanitization**: All form inputs must be sanitized to prevent SQL injection and cross-site scripting (XSS).

---

## 4. Performance & Execution Invariants

We target high responsiveness across web interfaces.

### Database Query Optimization
- Queries must utilize index constraints mapped in `022_indexes.sql`. Table scans on large tables (e.g., `invoices`, `messages`) are unacceptable.
- Avoid the N+1 query problem inside loop blocks. Database calls must retrieve required relational records using joins or batch queries.

### Frontend Responsiveness
- Render UI interactions immediately. Long-running transactions must present visual loading skeletons rather than locking page state.
- Leverage client-side caching (e.g., SWR, React Query) to avoid redundant network roundtrips.
- Standard assets must be optimized, and larger assets (e.g., verification photos) must use compressed uploads to Supabase Storage.
