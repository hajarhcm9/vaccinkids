'use strict';

const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  FIX: Restore audit_log columns for adminController');
console.log('============================================================\n');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: PROJECT, encoding: 'utf8', timeout: 120000, ...options });
  } catch (e) {
    return e.stdout || e.stderr || e.message;
  }
}

// ============================================================
// STEP 1: Add missing columns back to audit_log
// ============================================================
console.log('STEP 1: Adding missing columns to audit_log...\n');

const addColumns = run(`docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "
DO \\$\\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'table_name') THEN
    ALTER TABLE audit_log ADD COLUMN table_name VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'record_id') THEN
    ALTER TABLE audit_log ADD COLUMN record_id INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'old_values') THEN
    ALTER TABLE audit_log ADD COLUMN old_values JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'new_values') THEN
    ALTER TABLE audit_log ADD COLUMN new_values JSONB;
  END IF;
  -- Also add a 'timestamp' column alias since old code may use it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'timestamp') THEN
    ALTER TABLE audit_log ADD COLUMN \"timestamp\" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END \\$\\$;
"`);
console.log('  Result:', addColumns.substring(0, 300));

// ============================================================
// STEP 2: Verify all columns exist
// ============================================================
console.log('\nSTEP 2: Verifying audit_log columns...\n');

const verify = run(`docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_log' ORDER BY ordinal_position"`);
console.log(verify);

// ============================================================
// STEP 3: Run the failing tests only
// ============================================================
console.log('\nSTEP 3: Running adminManagement tests...\n');

const adminResult = run('npx jest tests/adminManagement.test.js --forceExit --detectOpenHandles 2>&1 | tail -30');
console.log(adminResult);

// ============================================================
// STEP 4: Run full suite
// ============================================================
console.log('\nSTEP 4: Running FULL test suite...\n');

const fullResult = run('npx jest --forceExit --detectOpenHandles 2>&1 | tail -15');
console.log(fullResult);
