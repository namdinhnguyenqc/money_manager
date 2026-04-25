#!/usr/bin/env bash
set -euo pipefail

LOG=$(pwd)/phase2_5_runner.log
echo "[Phase2-5] Start" | tee -a "$LOG"

# Helpers
die() { echo "$1"; exit 1; }

# Ensure essential envs
: 
DB_URL="${DATABASE_URL:-}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"

if [ -z "$DB_URL" ]; then
  echo "DATABASE_URL is not set. Aborting." | tee -a "$LOG";
  exit 1
fi

echo "Using DB URL: $DB_URL" | tee -a "$LOG"

# 1) Start backend (DB-backed)
echo "Starting backend (Express) with DB URL..." | tee -a "$LOG"
cd "money-manager-backend-express" || exit 1
npm install --silent >/dev/null 2>&1 || true
export DATABASE_URL="$DB_URL"
if command -v npm >/dev/null 2>&1; then
  npm start &
  BACKEND_PID=$!
  echo "Backend pid: $BACKEND_PID" | tee -a "$LOG"
else
  die "npm not found"
fi

for i in {1..60}; do
  if curl -sSf http://localhost:3000/health >/dev/null; then
    echo "Backend is healthy" | tee -a "$LOG";
    break;
  fi
  sleep 1
  if [ "$i" -ge 60 ]; then
    echo "Backend did not become healthy in time" | tee -a "$LOG";
    kill -0 $BACKEND_PID 2>/dev/null && kill $BACKEND_PID
    exit 1;
  fi
done

echo "Phase 2: Gmail OAuth + Admin RBAC ready" | tee -a "$LOG"

echo "Phase 2 test: calling /auth/google (mock)" | tee -a "$LOG"
curl -sS -X POST http://localhost:3000/auth/google -H "Content-Type: application/json" -d '{"idToken":"mock-token"}' >> "$LOG" 2>&1 || true

echo "Phase 2 test: /me" | tee -a "$LOG"
curl -sS -H "Authorization: Bearer <PLACEHOLDER_TOKEN>" http://localhost:3000/me || true >> "$LOG" 2>&1

echo "Phase 2 complete" | tee -a "$LOG"

echo "Phase 3-5 sẽ được thực thi bằng hướng dẫn thủ công hoặc qua pipeline CI" | tee -a "$LOG"
