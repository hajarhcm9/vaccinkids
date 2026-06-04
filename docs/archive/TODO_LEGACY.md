# VacciniKids Bug Fixes TODO

Current working directory: /Users/macos/Desktop/vaccinkids/vaccinkids

## Status: Pending Implementation

### 1. [x] Fix Bug #1: database.js pool error handler
 - Edit src/config/database.js: Exact report APRES code (err.message, conditional exit).
 - Test: `npm run dev` - server stable, no clean exit ✅

### 2. [x] Bug #2: Documentation & Test Data
 - Run migrations: node src/models/migrationRunner.js or npm run migrate to seed ADMIN01/INFIRM01 accounts. (Pending - recommend user run)
 - Create README.md: Added test accounts, cURL examples, auth flow.

### 3. [x] Fix Bug #3: Flacon.js openFlacon SQL params
 - Rewrote to exact report APRES dynamic paramIndex logic.
 - Bugs #4,5,6 already correct.

### 4. [ ] Test Full Flow
- Login cURL with ADMIN01, get token.
- GET /api/sessions/:id with token.
- Check server stability.

### 5. [ ] Optional Improvements from Report
- Add DB transactions to controllers.
- OTP rate limiting.
- Audit logging integration.
- Stats routes.

**Next Step:** Implement Bug #1 edit.

