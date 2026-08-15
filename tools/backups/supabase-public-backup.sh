#!/usr/bin/env bash

set -Eeuo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the PostgreSQL connection string from Supabase Dashboard}"

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups/supabase}"
mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="$BACKUP_DIR/trocare-public-${timestamp}.dump"
checksum_file="$backup_file.sha256"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required. Install PostgreSQL client tools first." >&2
  exit 1
fi

echo "Creating public-schema backup: $backup_file"

# The public schema contains application data and RPCs. Auth and Storage are
# intentionally excluded because they need their own export/migration process.
pg_dump \
  --dbname="$SUPABASE_DB_URL" \
  --schema=public \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$backup_file"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$backup_file" > "$checksum_file"
else
  shasum -a 256 "$backup_file" > "$checksum_file"
fi

echo "Backup created: $backup_file"
echo "Checksum created: $checksum_file"
echo "Keep both files outside Git and outside the Supabase project."
