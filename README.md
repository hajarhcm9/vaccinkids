# VacciniKids

VacciniKids contains:

- a Node.js/Express/PostgreSQL API in `src/`;
- a React Native parent application in `App.js`, `src/screens/`, `android/`, and `ios/`;
- a native Android personnel/admin application in `app/`;
- static admin and waiting-room interfaces in `public/`.

For the complete delivery audit and prioritized remaining work, see
[`docs/AUDIT_LIVRABILITE.md`](docs/AUDIT_LIVRABILITE.md).

## Quick Start

1. Clone repo
2. `cd vaccinkids`
3. `cp .env.example .env` - configure DB
4. `npm run docker:up` (PostgreSQL exposed on host port `5433`)
5. `npm install`
6. Set `DB_PORT=5433` in `.env` when using Docker
7. `npm run migrate`
8. `npm run dev` (nodemon)

API at http://localhost:3000

## Test Accounts (Personnel)

| Role     | CIN       | Password    | Centre       |
|----------|-----------|-------------|--------------|
| Admin    | ADMIN01   | admin123    | Centre Es-Salaam |
| Infirmier| INFIRM01  | infirmier123| Centre Es-Salaam |

**Seeded by migration 002_seed_admin_and_fixes.sql**

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
