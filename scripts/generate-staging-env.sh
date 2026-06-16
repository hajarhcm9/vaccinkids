#!/usr/bin/env bash
# Generates a .env.staging file with all random secrets pre-filled.
# Credentials that require external accounts (SMS, Firebase, email) are left
# as FILL_ME_IN placeholders — the script tells you exactly which ones.
#
# Usage:
#   bash scripts/generate-staging-env.sh
#   # Then edit .env.staging and fill in the FILL_ME_IN values.

set -euo pipefail

OUT=".env.staging"

if [[ -f "$OUT" ]]; then
  echo "ERROR: $OUT already exists. Delete it first if you want to regenerate."
  exit 1
fi

rand() { openssl rand -hex "$1"; }

echo "Generating secrets..."

cat > "$OUT" <<EOF
# ============================================================
# VacciniKids — Staging environment (auto-generated $(date -u +%Y-%m-%dT%H:%M:%SZ))
# Keep this file secret. Never commit it.
# ============================================================

# ---- Server ----
NODE_ENV=staging
PORT=3000
LOG_USER_HASH_SALT=$(rand 32)
METRICS_BEARER_TOKEN=$(rand 32)

# ---- PostgreSQL ----
DB_NAME=vaccinikids_staging
DB_USER=vaccinikids_staging_user
DB_PASSWORD=$(rand 32)

# ---- Redis ----
REDIS_PASSWORD=$(rand 32)

# ---- JWT ----
JWT_SECRET=$(rand 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$(rand 64)
JWT_REFRESH_EXPIRES_IN=7d

# ---- OTP ----
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_HASH_SECRET=$(rand 64)

# ---- SMS — FILL IN: register at smspartner.fr ----
SMS_PROVIDER=smspartner
SMS_API_KEY=FILL_ME_IN
SMS_SENDER_NAME=VacciniKids
SMS_API_URL=https://api.smspartner.fr/v1/send
SMS_AUTH_SCHEME=Bearer
ALLOW_PROVIDER_STUBS=false

# ---- Firebase Cloud Messaging — FILL IN: Firebase console → Service accounts → Generate key ----
FIREBASE_PROJECT_ID=FILL_ME_IN
FIREBASE_PRIVATE_KEY=FILL_ME_IN
FIREBASE_CLIENT_EMAIL=FILL_ME_IN
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# ---- Email — FILL IN: use any SMTP provider (Gmail, SendGrid, Brevo) ----
EMAIL_HOST=FILL_ME_IN
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=FILL_ME_IN
EMAIL_PASSWORD=FILL_ME_IN
EMAIL_FROM="VacciniKids <noreply@vaccinikids.ma>"

# ---- CORS — FILL IN: replace with your actual staging domain ----
CORS_ORIGIN=https://FILL_ME_IN

# ---- Staff Android staging build ----
STAFF_API_BASE_URL=https://FILL_ME_IN/api/

# ---- Optional surfaces ----
WEB_ADMIN_ENABLED=false
WAITING_ROOM_ENABLED=false
SWAGGER_ENABLED=false

# ---- Audit (enable when a collector is available) ----
AUDIT_EXTERNAL_URL=
AUDIT_EXTERNAL_SECRET=
AUDIT_EXTERNAL_REQUIRED=false

# ---- Docker PostgreSQL (used by the postgres container) ----
DB_HOST=postgres
DB_PORT=5432
EOF

echo ""
echo "✅  $OUT created with random secrets."
echo ""
echo "Now fill in the following FILL_ME_IN values:"
grep -n "FILL_ME_IN" "$OUT" | sed 's/=FILL_ME_IN//'
echo ""
echo "Once done, run: npm run staging:up"
