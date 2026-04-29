# VacciniKids API

Node.js/Express backend for childhood vaccination management in Morocco (PostgreSQL).

## Quick Start

1. Clone repo
2. `cd vaccinkids`
3. `cp .env.example .env` - configure DB
4. `docker-compose up -d` (PostgreSQL)
5. `npm install`
6. `npm run migrate` (run migrations including test data)
7. `npm run dev` (nodemon)

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

