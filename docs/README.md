# TrọCare Canonical Documentation Index

Welcome to the TrọCare Platform Developer and AI Agent Documentation. This directory serves as the single source of truth for the platform's system design, architecture runtime, operational rules, database schemas, and developer standards.

---

## 🤖 AI Agent Quick Start: Core Rules & File Routing Board

> [!IMPORTANT]
> **READ THIS SECTION FIRST.** If you are an AI coding agent starting a new task, read this routing board to understand the non-negotiable rules and identify exactly which sub-documents you need to open. **Do not read the entire documentation folder; only open the target files mapped below.**

### 🚨 1. Global Core Business Invariants (Never Break These)
- **Profile Mandatory Guard**: Access to any owner/admin dashboards requires a completed profile. Return `403 PROFILE_REQUIRED` and redirect to `/complete-profile` if incomplete.
- **Email is Readonly**: The landlord's email is registered via Google OAuth and is strictly **READONLY** in profile updates.
- **Form Error Input Preservation**: Forms must preserve all user-entered fields upon receiving backend validation errors (e.g., unique phone number clash).
- **Tenant Validation**: Before activating a lease contract, tenant `phone` must be exactly **10 digits** and `idCard` (CCCD) exactly **12 digits**.
- **Room Lifecycle locks**: Activating a lease contract locks room status to `OCCUPIED`. Terminating a lease releases room status to `AVAILABLE`.
- **Deduplication Checks**: Invoices must block duplicate entries for the same room, contract, month, and year. Financial updates require `x-idempotency-key` headers.

### 🗺️ 2. Task-Based Documentation Routing Matrix
Look up your task keywords below to find the specific files you should open:

| Task Keywords / Mentions | Target Documentation Files to Read |
|---|---|
| **Google Login, Sign-In, Onboarding, Profile Forms** | 1. [02-business-rules/core-invariants.md](file:///Users/thao/money_manager/docs/02-business-rules/core-invariants.md)<br>2. [03-features/owner-onboarding/README.md](file:///Users/thao/money_manager/docs/03-features/owner-onboarding/README.md)<br>3. [03-features/owner-onboarding/rules.md](file:///Users/thao/money_manager/docs/03-features/owner-onboarding/rules.md) |
| **Dãy trọ, Facilities, Room CRUD, Room Status** | 1. [03-features/facility-room-management/README.md](file:///Users/thao/money_manager/docs/03-features/facility-room-management/README.md)<br>2. [03-features/facility-room-management/rules.md](file:///Users/thao/money_manager/docs/03-features/facility-room-management/rules.md) |
| **Lease, Hợp đồng, Tenants, Sign Contracts, Terminate, Deposits, Đặt cọc** | 1. [03-features/contract-management/README.md](file:///Users/thao/money_manager/docs/03-features/contract-management/README.md)<br>2. [03-features/contract-management/rules.md](file:///Users/thao/money_manager/docs/03-features/contract-management/rules.md) |
| **Hóa đơn, Invoices, Meter Readings, Payments** | 1. [03-features/billing-payments/README.md](file:///Users/thao/money_manager/docs/03-features/billing-payments/README.md)<br>2. [03-features/billing-payments/rules.md](file:///Users/thao/money_manager/docs/03-features/billing-payments/rules.md) |
| **Thu chi, Transactions, Wallets, Categories, Phiếu thu, Phiếu chi, Ví tiền** | 1. [04-api-contract/endpoints-map.md](file:///Users/thao/money_manager/docs/04-api-contract/endpoints-map.md) (Section 8)<br>2. [05-database/database-schema.md](file:///Users/thao/money_manager/docs/05-database/database-schema.md) (Financial Domain) |
| **Trading, Hàng hóa, Inventory, Kinh doanh, Mua bán** | 1. [04-api-contract/endpoints-map.md](file:///Users/thao/money_manager/docs/04-api-contract/endpoints-map.md) (Section 9)<br>2. [05-database/database-schema.md](file:///Users/thao/money_manager/docs/05-database/database-schema.md) (Trading Domain) |
| **Marketplace Search, Guest Portal, booking, leads** | 1. [03-features/public-marketplace/README.md](file:///Users/thao/money_manager/docs/03-features/public-marketplace/README.md)<br>2. [03-features/public-marketplace/rules.md](file:///Users/thao/money_manager/docs/03-features/public-marketplace/rules.md) |
| **Super Admin views, Roles change, Ban users** | 1. [03-features/admin-management/README.md](file:///Users/thao/money_manager/docs/03-features/admin-management/README.md)<br>2. [03-features/admin-management/rules.md](file:///Users/thao/money_manager/docs/03-features/admin-management/rules.md) |
| **API standard error codes, Endpoints catalog, headers** | 1. [04-api-contract/api-governance.md](file:///Users/thao/money_manager/docs/04-api-contract/api-governance.md)<br>2. [04-api-contract/endpoints-map.md](file:///Users/thao/money_manager/docs/04-api-contract/endpoints-map.md) |
| **PostgreSQL tables, schemas, RLS, DB Migrations** | 1. [05-database/database-schema.md](file:///Users/thao/money_manager/docs/05-database/database-schema.md)<br>2. [05-database/migrations-runbook.md](file:///Users/thao/money_manager/docs/05-database/migrations-runbook.md) |
| **Typescript standards, lint rules, folder guidelines** | 1. [06-engineering-rules/engineering-constitution.md](file:///Users/thao/money_manager/docs/06-engineering-rules/engineering-constitution.md) |
| **Colors, Design tokens, Animations, Skeletal Loading** | 1. [07-ui-ux-system/design-tokens-ui.md](file:///Users/thao/money_manager/docs/07-ui-ux-system/design-tokens-ui.md) |
| **Mobile app, React Native, Expo, JWT lifecycle, Push Notification** | 1. [08-mobile/mobile-compatibility.md](file:///Users/thao/money_manager/docs/08-mobile/mobile-compatibility.md)<br>2. [01-architecture/architecture-runtime.md](file:///Users/thao/money_manager/docs/01-architecture/architecture-runtime.md) |
| **Env setup, Local launch command, test run commands** | 1. [09-dev-guidelines/getting-started.md](file:///Users/thao/money_manager/docs/09-dev-guidelines/getting-started.md)<br>2. [09-dev-guidelines/testing-guidelines.md](file:///Users/thao/money_manager/docs/09-dev-guidelines/testing-guidelines.md) |

---

## 📂 Documentation Directory Index

Explore the structured documentation hierarchy below:

### 🌐 1. High-Level Core Design & Topology
- **[00-System Design & Overview](file:///Users/thao/money_manager/docs/00-system-design/system-overview.md)**
  *Product vision, user demographics, release posture, and platform scope transitions.*
- **[01-Architecture Runtime Context](file:///Users/thao/money_manager/docs/01-architecture/architecture-runtime.md)**
  *Runtime topology (Next.js 14 -> Hono -> Supabase), route map bindings, and authentication token middleware guards.*
- **[02-Business Rules & Invariants](file:///Users/thao/money_manager/docs/02-business-rules/core-invariants.md)**
  *Codified business rules and database constraints (profile completion fields, phone validations, booking transition locks).*

### 🛠 2. Module Specifications & Contracts
- **[03-Feature Submodules](file:///Users/thao/money_manager/docs/03-features/)**
  *Detailed specifications per core feature area (Flows, rules, state tables, API maps, mobile integration, and edge cases):*
  1. [Owner Onboarding & Profile Verification](file:///Users/thao/money_manager/docs/03-features/owner-onboarding/README.md)
  2. [Facility & Room Management](file:///Users/thao/money_manager/docs/03-features/facility-room-management/README.md)
  3. [Contract & Lease Management](file:///Users/thao/money_manager/docs/03-features/contract-management/README.md)
  4. [Billing & Invoices](file:///Users/thao/money_manager/docs/03-features/billing-payments/README.md)
  5. [Public Marketplace Search](file:///Users/thao/money_manager/docs/03-features/public-marketplace/README.md)
  6. [Admin Management Dashboard](file:///Users/thao/money_manager/docs/03-features/admin-management/README.md)
- **[04-API Contracts & Governance](file:///Users/thao/money_manager/docs/04-api-contract/api-governance.md)**
  *Global error envelopes (`VALIDATION_FAILED`, `PROFILE_REQUIRED`), standard response structures, and [System Endpoints Routing Map](file:///Users/thao/money_manager/docs/04-api-contract/endpoints-map.md).*
- **[05-Database Architecture](file:///Users/thao/money_manager/docs/05-database/database-schema.md)**
  *PostgreSQL entity-relationship layouts, constraints, Row-Level Security (RLS) policies, and [Database Migrations Runbook](file:///Users/thao/money_manager/docs/05-database/migrations-runbook.md) (016 to 022).*

### 📐 3. Engineering Guidelines & System Standards
- **[06-Engineering Constitution](file:///Users/thao/money_manager/docs/06-engineering-rules/engineering-constitution.md)**
  *Typing guidelines, naming structures, codebase layout rules, and optimization limits.*
- **[07-UI/UX Design Tokens](file:///Users/thao/money_manager/docs/07-ui-ux-system/design-tokens-ui.md)**
  *Theme palettes (HSL variables), responsive grids, animated micro-interactions, and skeletal loading states.*
- **[08-Mobile Compatibility](file:///Users/thao/money_manager/docs/08-mobile/mobile-compatibility.md)**
  *Token exchange strategies, push notification hooks, FCM setups, and device-native considerations.*
- **[09-Developer Guidelines](file:///Users/thao/money_manager/docs/09-dev-guidelines/getting-started.md)**
  *Local server booting guide, env layouts, and [Automated & Manual QA Checklists](file:///Users/thao/money_manager/docs/09-dev-guidelines/testing-guidelines.md).*
- **[10-AI Coding Agent Playbook](file:///Users/thao/money_manager/docs/10-ai-context/ai-agent-playbook.md)**
  *Subagent prompt triggers, decision flow routes, and coding heuristics for pair-programming models.*

---

## 📦 Active Project Environment At A Glance

- **Admin Web Application**: Next.js 14 App Router (Port `3001` or `3000`)
- **Backend Hono Service**: Hono on Node Server (Port `8787`)
- **Database Backend**: PostgreSQL managed via Supabase CLI / Supabase Cloud
- **Local Dev Launch Command**:
  ```bash
  npm run local
  ```
