# Money Manager / Room Rental Ops

This repository currently contains multiple app layers:

- `web-admin/`: current Next.js 14 admin/owner web portal.
- `money-manager-mobile/backend/`: current Hono backend used by `web-admin` in local development.
- `money-manager/`: legacy Vite React app kept as reference/compatibility UI.
- `money-manager-backend-express/`: legacy Express-style backend kept as reference.

Start local development from the repo root:

```bash
npm run local
```

Default local URLs:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8787`

The canonical documentation set is in [`docs/README.md`](docs/README.md). Start there before changing business logic, APIs, or UI flows.
