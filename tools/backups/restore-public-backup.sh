#!/usr/bin/env bash

set -Eeuo pipefail

: "${TARGET_DB_URL:?Set TARGET_DB_URL to an empty PostgreSQL database}"
: "${BACKUP_FILE:?Set BACKUP_FILE to a .dump file created by supabase-public-backup.sh}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file does not exist: $BACKUP_FILE" >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

if [ "${ALLOW_DESTRUCTIVE_RESTORE:-false}" != "true" ]; then
  cat >&2 <<'EOF'
Restore is intentionally blocked by default.
Set ALLOW_DESTRUCTIVE_RESTORE=true only when TARGET_DB_URL points to a
disposable/empty database and you have verified the backup checksum.
EOF
  exit 1
fi

pg_restore \
  --dbname="$TARGET_DB_URL" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$BACKUP_FILE"

echo "Restore completed: $BACKUP_FILE"
