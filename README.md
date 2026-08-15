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

⚠️ **The trap:** [`vercel.json`](./vercel.json) in this root forces
`npm --prefix web-admin run build`. It applies to any Vercel project whose Root
Directory is `.`, and it **overrides the dashboard settings** — so a project
configured to build `admin-portal` will still build the owner app. Keep each
project's Root Directory pointed at its own subdirectory and this file stays out
of scope.

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
