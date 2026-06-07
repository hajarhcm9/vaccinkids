#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"

command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required" >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo "age is required" >&2; exit 1; }

backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="${backup_dir}/vaccinikids-${timestamp}.dump.age"

mkdir -p "$backup_dir"
umask 077
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" \
  | age --recipient "$BACKUP_AGE_RECIPIENT" --output "$output"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$output" > "${output}.sha256"
else
  shasum -a 256 "$output" > "${output}.sha256"
fi

echo "Encrypted backup created: $output"
