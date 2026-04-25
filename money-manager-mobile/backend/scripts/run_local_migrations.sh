#!/usr/bin/env bash
set -euo pipefail

echo "Starting local Postgres via docker-compose..."
docker-compose -f ./docker-compose.yml up -d postgres

CONTAINER=$(docker-compose -f ./docker-compose.yml ps -q postgres || true)
if [ -z "$CONTAINER" ]; then
  echo "Postgres container not found. Exiting." >&2
  exit 1
fi

echo "Waiting for Postgres to be ready..."
for i in {1..60}; do
  if docker exec -i "$CONTAINER" pg_isready -U mm -d money_manager >/dev/null 2>&1; then
    echo "Postgres is ready."
    break
  fi
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo "Postgres did not become ready in time." >&2
    exit 1
  fi
fi

export DATABASE_URL="postgres://mm:mm@localhost:5432/money_manager"

echo "Applying migrations against local DB..."
node ./scripts/apply_migrations.js

echo "Migrations applied successfully."
