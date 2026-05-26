# Contract Management — API Mapping

## Tenant APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/rental/tenants` | Pages/service | Tenant list. |
| `POST` | `/rental/tenants` | `createTenant()` | Creates tenant after FE validation of phone/CCCD. |
| `PATCH` | `/rental/tenants/:id` | Service/page | Update tenant info. |

## Contract APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/rental/contracts/active` | Contract/invoice helpers | List active contracts. |
| `POST` | `/rental/contracts` | `createContract()` | Creates contract, marks room occupied, binds services. |
| `PATCH` | `/rental/contracts/:id` | Service | Update contract and services. |
| `POST` | `/rental/contracts/:id/terminate` | `terminateContract()` | Ends contract, frees room, optional deposit refund transaction. |
| `GET` | `/rental/contracts/:id/services` | Invoice/contract helpers | Contract-bound services list. |
| `DELETE` | `/rental/contracts/:id` | `deleteContract()` | Deletes contract and frees room. |

## Service APIs

| Method | Endpoint | FE Caller | Notes |
|---|---|---|---|
| `GET` | `/rental/services` | Invoice/contract pages | Utility/service list (electricity, water, etc.). |
| `POST` | `/rental/services` | Service page | Create new service type. |
| `PATCH` | `/rental/services/:id` | Service page | Update service price/active status. |
| `DELETE` | `/rental/services/:id` | Service page | Delete service. |

## Code Paths

| Layer | File |
|---|---|
| FE Contract New | `web-admin/src/app/(owner-ops)/contracts/new/page.tsx` |
| FE Contract Detail | `web-admin/src/app/(owner-ops)/contracts/[id]/page.tsx` |
| FE Service | `web-admin/src/lib/rentalOps.ts` |
| BE Rental Routes | `backend/src/routes/rental.ts` |
