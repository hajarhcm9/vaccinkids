#!/usr/bin/env bash
set -euo pipefail

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_AGE_IDENTITY_FILE:?BACKUP_AGE_IDENTITY_FILE is required}"

backup_file="${1:?Usage: npm run db:restore -- /path/to/backup.dump.age}"

case "$RESTORE_DATABASE_URL" in
  *restore*|*isolated*|*test*) ;;
  *) echo "Restore target must contain restore, isolated, or test" >&2; exit 1 ;;
esac

command -v age >/dev/null 2>&1 || { echo "age is required" >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required" >&2; exit 1; }
test -f "$backup_file" || { echo "Backup file not found" >&2; exit 1; }

age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$backup_file" \
  | pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl \
      --dbname "$RESTORE_DATABASE_URL"

echo "Restore completed into isolated target"
