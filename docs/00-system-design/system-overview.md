# System Design & Overview — TrọCare

TrọCare is an enterprise-grade SaaS and marketplace platform tailored for the boarding house and room-rental industry in Vietnam. It bridges the gap between landlords (owners) who manage properties and tenants looking for housing (guests/customers).

## 1. Product Summary & Vision
The core mission of TrọCare is to simplify and digitize room rental operations. Originally conceived as a personal money manager, the platform has evolved into a robust property management system (PMS) and public marketplace. 

Key pillars of TrọCare:
- **Operations & Billing Management**: Automating contracts, invoice generation (with utility meter readings), and rent collections.
- **Listing & Discovery (Marketplace)**: A public marketplace allowing landlords to list vacant rooms, and tenants to search/filter properties based on location and price.
- **Financial Ledger & Analytics**: Tracking multi-wallet balances, recording categorized income/expense transactions, and presenting operational dashboards.

## 2. Product Scope
TrọCare's architecture is structured to support distinct portals:
- **Public Guest Portal**: Location-based boarding house search, room detail view, and guest lead/booking submission.
- **Owner (Landlord) Operations**: Management of boarding houses, rooms, contracts, tenants, utilities, invoices, transactions, wallets, and leads/messages.
- **Super Admin Governance**: System-wide oversight of users, listings, platform statistics, moderation, and audit logs.

## 3. Core Entities
The system revolves around the following main entities and relationships:
- **User / Account**: Defines authentication identity and role permissions (GUEST, OWNER, ADMIN, SUPER_ADMIN).
- **Boarding House (Building)**: A physical property owned by an OWNER. Located within a specific geographic hierarchy (Province → District → Ward).
- **Room**: A specific unit under a Boarding House. Inherits the publishing/visibility state of its parent Boarding House.
- **Tenant**: A registered occupant associated with a room contract.
- **Contract**: Defines the lease agreement between Owner and Tenant, including default rent, utility price bindings, deposit, billing cycle day, and duration.
- **Invoice**: A monthly statement for a room contract containing calculated utility costs (based on electricity/water meter readings), rent, and extra fees.
- **Transaction**: Ledger records tracking payments made against invoices or other business actions. Maps to a specific Owner wallet.
- **Wallet**: Financial account representing income collection methods (e.g., cash, bank transfer, e-wallet).

## 4. Release Posture & Gaps
The platform maintains a staged release posture:
- **Phase 1 (MVP - Operational Core)**: Google Authentication, basic profile complete guard, boarding house and room management, contract creation, monthly invoicing, ledger tracking, public listing, and lead routing.
- **Phase 2 (Rental Ops Enrichment)**: Bank QR configuration, auto-generating draft invoices, bulk payments, tenant setting profiles, and guest booking holds.
- **Phase 3 (Enterprise Scales)**: Advanced roles and permissions (RBAC), team/staff assignment, automated outbox messaging (Zalo/SMS), RLS enforcement in Supabase, and multi-tenant ledger isolation.
