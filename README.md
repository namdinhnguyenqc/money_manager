# Money Manager / Room Rental Ops

## Which directory is which app

The directory names are misleading and have caused a production misconfiguration
before — read this table before touching any deploy setting.

| Directory | What it actually is | Deploys to | Root Directory |
|---|---|---|---|
| `web-admin/` | **Web for landlords** (owner app) — *not* the admin portal, despite the name. 38 owner pages + landing. | `trocare-production` | `web-admin` |
| `admin-portal/` | **The real internal admin portal.** Only place with `/admin/owners` and `/admin/users`. | `tcare.production` | `admin-portal` |
| `backend/` | Hono API. | Render (`money-manager-xdem`) | `backend` |
| `mobile/` | Expo / React Native app. | EAS | — |
| `money-manager/` | Legacy Vite React app, reference only. | — | — |
| `money-manager-backend-express/` | Legacy Express backend, reference only. | — | — |

⚠️ **Do not add a `vercel.json` to this root.** One used to live here forcing
`npm --prefix web-admin run build`. A repo-root `vercel.json` applies to any
Vercel project whose Root Directory is `.` and **overrides that project's
dashboard settings**, so `tcare.production` — configured to build
`admin-portal` — silently shipped the owner app instead, and reverted to it on
every push. Each app already carries its own `vercel.json`; keep the config
next to the app it configures.

`admin-portal/` is intentionally **not** an npm workspace (it keeps its own
lockfile and deploys standalone), so `npm run lint/typecheck/test --workspaces`
skips it. CI has separate steps for it.

## Verifying a deploy

Compiling is not evidence the site works — every outage this repo has shipped
type-checked cleanly first. After deploying:

```bash
node tools/smoke-test.mjs           # all targets
node tools/smoke-test.mjs admin     # one target
```

It asserts each host serves the app it is supposed to, not merely that it
answers with HTTP 200.

Start local development from the repo root:

```bash
npm run local
```

Default local URLs:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8787`

The canonical documentation set is in [`docs/README.md`](docs/README.md). Start there before changing business logic, APIs, or UI flows.
