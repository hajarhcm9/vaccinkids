# VacciniKids

VacciniKids contains:

- a Node.js/Express/PostgreSQL API in `src/`;
- a React Native parent application in `App.js`, `src/screens/`, `android/`, and `ios/`;
- a native Android personnel/admin application in `app/`;
- static admin and waiting-room interfaces in `public/`.

For the complete delivery audit and prioritized remaining work, see
[`docs/AUDIT_LIVRABILITE.md`](docs/AUDIT_LIVRABILITE.md).

Operational documentation:

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/RELEASE_ANDROID_PARENT.md`](docs/RELEASE_ANDROID_PARENT.md)
- [`docs/RELEASE_ANDROID_STAFF.md`](docs/RELEASE_ANDROID_STAFF.md)

## Quick Start

1. Clone repo
2. `cd vaccinkids`
3. `cp .env.example .env` - configure DB
4. `npm run docker:up` (PostgreSQL exposed on host port `5433`)
5. `npm install`
6. Set `DB_PORT=5433` in `.env` when using Docker
7. `npm run migrate`
8. `npm run seed:dev` to install the optional local test accounts
9. `npm run dev` (nodemon)

API at http://localhost:3000

## Test Accounts (Personnel)

| Role     | CIN       | Password    | Centre       |
|----------|-----------|-------------|--------------|
| Admin    | ADMIN01   | admin123    | Centre Es-Salaam |
| Infirmier| INFIRM01  | infirmier123| Centre Es-Salaam |

**Development only:** created by `npm run seed:dev`. The command refuses to run when
`NODE_ENV=production`; production administrators must be provisioned separately.

## Production Admin Bootstrap

After migrations, create the first production administrator once:

```bash
BOOTSTRAP_ADMIN_CIN=... \
BOOTSTRAP_ADMIN_NOM=... \
BOOTSTRAP_ADMIN_PRENOM=... \
BOOTSTRAP_ADMIN_PASSWORD=... \
BOOTSTRAP_ADMIN_CENTRE_ID=1 \
npm run admin:bootstrap
```

The command requires a strong password, writes an audit event and refuses to run when an
administrator already exists. Remove the bootstrap variables immediately after use.

## Tests

`npm test` recreates the dedicated `TEST_DB_NAME` database before running Jest. For
safety, the database name must end with `_test`; the development database is never reset.

## Authentication Flow

**Personnel Login:**
```bash
curl -X POST http://localhost:3000/api/auth/personnel/login \\
  -H "Content-Type: application/json" \\
  -d '{\"cin\":\"ADMIN01\",\"mot_de_passe\":\"admin123\"}'
```
Response: { accessToken, refreshToken }

**Protected Route:**
```bash
curl http://localhost:3000/api/sessions \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Parent:** POST /api/auth/parent/send-otp {telephone} then verify-otp {telephone, code}

## Bugs Fixed

See Bug Report for details. Server no longer clean-exits on pool errors.

## API Docs

Swagger/OpenAPI at /api-docs (if enabled)

Routes:
- /api/sessions
- /api/auth/*
