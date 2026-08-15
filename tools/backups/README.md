# Supabase backup runbook

This runbook keeps an independent copy of TrọCare's application database without
adding a second application/staging source.

## What is backed up

`supabase-public-backup.sh` exports the `public` schema: application tables,
indexes, functions, and data. It intentionally does not export Supabase Auth or
Storage. Keep Supabase Auth during the transition and export Storage objects
separately; a database dump only contains Storage metadata.

## Create a backup

Use the PostgreSQL connection string from Supabase Dashboard, never an anon key
or a service-role key:

```bash
export SUPABASE_DB_URL='postgresql://...'
BACKUP_DIR="$HOME/secure-backups/trocare" \
  ./tools/backups/supabase-public-backup.sh
```

The output is a custom-format `.dump` plus a SHA-256 checksum. Keep two copies:
an encrypted local copy and an off-site copy (for example, an encrypted drive or
private object storage). Do not commit them to Git; the root `.gitignore`
excludes `/backups/`.

## Verify and restore a backup

Restore only into an empty/disposable PostgreSQL database (local Docker Postgres
is enough for a restore drill):

```bash
export TARGET_DB_URL='postgresql://...'
export BACKUP_FILE="$HOME/secure-backups/trocare/trocare-public-YYYYMMDDTHHMMSSZ.dump"
export ALLOW_DESTRUCTIVE_RESTORE=true

# Verify integrity first (macOS/Linux)
shasum -a 256 -c "$BACKUP_FILE.sha256"  # use sha256sum -c on Linux if preferred

./tools/backups/restore-public-backup.sh
```

After restoring, verify table counts, foreign keys, invoice/payment RPCs, and a
sample owner/tenant flow. A backup that has never been restored is not a tested
backup.
