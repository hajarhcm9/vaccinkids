# VacciniKids — Pre-Deploy Checklist

**Status as of June 2026** — All code is complete. This document tracks what still requires external credentials, infrastructure setup, or manual QA sign-off before the system serves real patients.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fixed in code — nothing left to do |
| ⛔ | Blocks staging from booting |
| 🔴 | Blocks QA on physical devices |
| 🟡 | Required before production go-live |
| 🟢 | Nice to have |

---

## 1. Secrets and credentials

| # | Item | Status | How |
|---|------|--------|-----|
| 1.1 | Generate all random secrets (JWT, OTP, DB, Redis…) | ✅ | Run `npm run staging:init` — creates `.env.staging` with all random secrets auto-filled |
| 1.2 | Obtain **SmsPartner** API key → `SMS_API_KEY` | 🔴 | Register at smspartner.fr, top up credits for Morocco |
| 1.3 | Obtain **Firebase** service account → `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` | 🔴 | Firebase console → Project settings → Service accounts → Generate key |
| 1.4 | Set up an **email** SMTP provider → `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` | 🟡 | Gmail App Password, SendGrid, or Brevo all work |
| 1.5 | Store secrets in **GitHub Secrets** for CI release builds | 🟡 | Settings → Secrets and variables → Actions |

---

## 2. Infrastructure

| # | Item | Status | How |
|---|------|--------|-----|
| 2.1 | Provision a VPS (Ubuntu 22.04, ≥2 vCPU / 4 GB RAM) | ⛔ | Hetzner CX22 or OVH VPS-2 are cost-effective options |
| 2.2 | Run one-time VPS bootstrap | ✅ | Script written: `sudo bash scripts/staging-setup.sh` — installs Docker, ufw, age, cron, creates backup key |
| 2.3 | Point DNS A record `staging.vaccinikids.ma` → VPS IP | ⛔ | Caddy needs port 80 reachable for Let's Encrypt ACME challenge |
| 2.4 | Update `Caddyfile.staging` with the real domain | ⛔ | Replace `staging.vaccinikids.ma` with your actual hostname |
| 2.5 | Firewall opens only ports 22, 80, 443 | ✅ | `staging-setup.sh` configures ufw automatically |

---

## 3. First-time database setup

```bash
# Step 1 — generate .env.staging (fills in all random secrets)
npm run staging:init
# Then open .env.staging and fill in the FILL_ME_IN lines (SMS key, Firebase, email, domain)

# Step 2 — start the full stack (builds Docker image locally, starts all 4 services)
npm run staging:up

# Step 3 — run all 25 migrations
npm run staging:migrate

# Step 4 — create first admin account
npm run staging:bootstrap
# You will be prompted for CIN, password, name, and centre_id.
# Create the first centre directly in psql if needed before this step.
```

| # | Item | Status |
|---|------|--------|
| 3.1 | `staging:up` now uses `--build` so the Docker image is always rebuilt from source | ✅ |
| 3.2 | `staging:migrate` and `staging:bootstrap` scripts added to `package.json` | ✅ |
| 3.3 | DB SSL: `disable` is correct for docker-compose (postgres on the same private bridge) | ✅ |
| 3.4 | For production with a managed cloud DB, set `DATABASE_URL` + `DATABASE_SSL_MODE=verify-full` | 🟡 |

---

## 4. Android builds for device QA

### Staff / admin app (Kotlin)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Generate a real release keystore | 🔴 | `keytool -genkeypair -v -keystore vaccinikids-staff.jks -alias staff-release -keyalg RSA -keysize 2048 -validity 10000` |
| 4.2 | Set `STAFF_ANDROID_RELEASE_STORE_FILE/PASSWORD/KEY_ALIAS/KEY_PASSWORD` | 🔴 | In `.env.staging` and in GitHub Secrets |
| 4.3 | `STAFF_API_BASE_URL` placeholder fixed in `.env.example` | ✅ | Now shows `YOUR_STAGING_DOMAIN` instead of `staging.example.ma` |
| 4.4 | Build `debugDevice` APK and sideload | 🔴 | `./gradlew :app:assembleDebugDevice` |

### Parent app (React Native)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.5 | Set `MOBILE_ENV=staging` and `API_BASE_URL=https://YOUR_DOMAIN/api` in `.env.staging` | 🔴 | Then run `npm run mobile:configure` before building |
| 4.6 | Generate a real release keystore for the parent app | 🔴 | Same `keytool` command, different alias |
| 4.7 | Add `google-services.json` to `android/app/` | 🔴 | Download from Firebase console |
| 4.8 | Register the parent app's SHA-1 fingerprint in the Firebase project | 🔴 | Required for FCM on physical devices |

---

## 5. iOS (if QA is needed on iPhone)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Enroll in Apple Developer Program ($99/year) | 🟡 | Required for real-device distribution |
| 5.2 | Create App ID + development provisioning profile | 🟡 | Includes test device UDIDs |
| 5.3 | Configure Xcode signing in `ios/VacciniKids.xcworkspace` | 🟡 | |
| 5.4 | Upload APNs authentication key to Firebase | 🟡 | Required for push notifications on iOS |

> iOS simulator QA is already covered by the CI `ios-debug` job. Physical device QA is only needed for push notifications and QR camera.

---

## 6. Test suite

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | `@testing-library/react-native` + `react-test-renderer` installed | ✅ | `npm install` already run |
| 6.2 | `test:mobile` added to CI `backend` job in `ci.yml` | ✅ | Runs after `mobile:bundle:android` on every push |
| 6.3 | Android instrumentation tests included in `android-instrumentation` CI job | ✅ | Runs on an emulator via `reactivecircus/android-emulator-runner` |
| 6.4 | Unused imports removed from `LoginFlowTest.kt` | ✅ | Fixed: removed 9 unused import lines |
| 6.5 | Performance test thresholds env-configurable | ✅ | `PERF_N1_RATIO_MAX` and `PERF_CONCURRENT_RPS_MIN` |

---

## 7. Reminder worker

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Reminder worker added as a dedicated service in `docker-compose.staging.yml` | ✅ | Starts automatically with `npm run staging:up` |
| 7.2 | Worker restarts on failure (`restart: unless-stopped`) | ✅ | |

---

## 8. Backup and recovery

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | `age` backup encryption key generation | ✅ | `staging-setup.sh` generates the key and prints `BACKUP_AGE_RECIPIENT` |
| 8.2 | Daily backup cron job | ✅ | `staging-setup.sh` installs `/etc/cron.d/vaccinikids-backup` (runs at 02:00 UTC) |
| 8.3 | Offsite backup copy | 🟡 | The cron job saves to `/var/backups/vaccinikids` on the VPS — you must set up offsite transfer (S3, rclone, etc.) separately |
| 8.4 | Test `npm run db:restore` at least once before go-live | 🟡 | |

---

## 9. Pre-launch QA sign-off checklist

Run through each flow manually on real devices before signing off:

- [ ] Parent: open app → phone entry → receive SMS OTP → verify → add baby → reach home screen
- [ ] Parent: view upcoming appointments → cancel one → confirm cancellation
- [ ] Parent: view health book for a baby with past vaccinations
- [ ] Nurse: login with CIN/password → reach dashboard → scan QR code of a test baby
- [ ] Nurse: record a vaccination (select vial, enter weight/height) → confirm saved
- [ ] Admin: login → view dashboard KPIs (centres, staff, sessions)
- [ ] Admin: create a new nurse account → nurse can log in
- [ ] Admin: create a vaccination session → nurse sees it on their dashboard
- [ ] Admin: export vaccination data as Excel → file downloads correctly
- [ ] Admin: view audit log → recent actions appear
- [ ] Push notification: nurse marks patient present → parent receives FCM notification
- [ ] Kiosk: patient checks in via QR → appears on nurse queue screen
- [ ] HTTPS: `https://staging.vaccinikids.ma` loads with a valid TLS cert (no browser warnings)
- [ ] Rate limiting: exceed 5 OTP attempts in 15 min → subsequent requests blocked

---

## 10. Remaining known limitations

| Item | Notes |
|------|-------|
| `SYNC_PUSH_ENABLED=false` | Offline sync push is disabled until the approved command matrix is defined for the pilot. Do not enable without reviewing `src/routes/syncRoutes.js`. |
| `WEB_ADMIN_ENABLED=false` | Web admin panel is intentionally disabled until a CSRF security review is completed. |
| iOS is simulator-only in CI | Real device QA for iOS requires Apple Developer enrollment (§5). |
| No multi-tenancy | Single-organisation pilot. National rollout would require schema changes. |
| Offsite backup not automated | Backups are encrypted and stored locally — offsite transfer must be configured manually (S3, rclone). |

---

## Quick-start summary (staging)

```bash
# On your development machine:
git clone ... && cd vaccinkids
npm run staging:init          # generates .env.staging with random secrets
# → fill in FILL_ME_IN values in .env.staging (5 items: SMS key, Firebase x3, email x3, domain)
# → update Caddyfile.staging with your real domain

# On the VPS (as root):
sudo bash scripts/staging-setup.sh   # installs Docker, ufw, age, cron, backup key

# Back on your machine (deploy):
scp -r . user@your-vps:/opt/vaccinikids
ssh user@your-vps "cd /opt/vaccinikids && npm run staging:up && npm run staging:migrate && npm run staging:bootstrap"
```
