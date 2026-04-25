Phase 5 Runbook (Canary → Pilot → Production)
Overview
- Phase 5 is for rollout orchestration with feature flags to minimize risk.
- We use cloud mode flag to enable Gmail/DB-backed paths incrementally.

Canary strategy
- Step 1: Canary for 5-10% users (per canary group) using canaryForUser logic.
- Step 2: Monitor Gmail login success rate, admin operations, and data isolation integrity.
- Step 3: If stable for 48-72h, expand to Pilot (30-40%), then Production.

Executive success criteria
- No data leakage across users. Data isolation preserved.
- Gmail login works in DB-backed path (or mocks) for canary group.
- Admin actions function correctly with RBAC in canary.
- Latency and error rate within acceptable SLA.

Rollout steps
1) Enable cloud mode flag on environment (cloud mode enabled = true).
2) Run Canary for a subset of users (via canaryForUser).
3) Validate: login, admin actions, and data isolation in canary cohort.
4) If OK, increase cohort to Pilot; monitor closely.
5) If Pilot OK, rollout to Production.
6) If issues, rollback cloud mode and revert migrations changes as needed.

Metrics to track
- Gmail login success rate by cohort
- Admin operations success rate (block/role/delete)
- Latency of API calls
- Data isolation validation metrics (no cross-user data)

Rollback plan
- Stop canary path by flipping CLOUD_MODE_ENABLED to false.
- If needed, revert canary changes in DB paths (clean up test data).
- Re-run critical tests to ensure stability.

Documentation and artifacts
- Phase 5 pipeline script (phase2_5_runner.sh) used to orchestrate Phase 2–5.
- Updated dashboards for monitoring canary vs pilot vs production.
