#!/usr/bin/env bash
set -euo pipefail

LOG_FILE="phase5_run.log"
LOG() { echo "[PHASE5] $1" | tee -a "$LOG_FILE"; }

export CLOUD_MODE=true
export CANARY_GROUP=${CANARY_GROUP:-default}
LOG "Starting Phase 5 run (Canary → Pilot → Production) for group: ${CANARY_GROUP}"

function health_check() {
  curl -sS http://localhost:3000/health || true
}

function test_auth_google() {
  local idToken=${1:-"mock-id-token"}
  LOG "Testing /auth/google with idToken=${idToken}"
  curl -sS -X POST http://localhost:3000/auth/google -H 'Content-Type: application/json' -d "{\"idToken\":\"${idToken}\"}" || true
}

function test_me() {
  LOG "Testing /me with access token"
  curl -sS -H "Authorization: Bearer $(grep -m1 -o 'Authorization: Bearer .*' -n /dev/null 2>/dev/null || echo '')" http://localhost:3000/me || true
}

function test_admin() {
  LOG "Testing admin endpoints (GET /admin/users)"
  curl -sS -H 'Authorization: Bearer <ADMIN_TOKEN>' http://localhost:3000/admin/users || true
}

echo "Running Phase 5 basic health checks..." | tee -a "$LOG_FILE"
health_check | tee -a "$LOG_FILE"

echo "Testing Gmail login (mock if credentials unavailable)" | tee -a "$LOG_FILE"
test_auth_google

echo "Testing /me endpoint" | tee -a "$LOG_FILE"
test_me

echo "Testing admin endpoints (requires real token)" | tee -a "$LOG_FILE"
test_admin

echo "Phase 5 basic run finished. See $LOG_FILE for details." | tee -a "$LOG_FILE"
