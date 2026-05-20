#!/usr/bin/env node
/**
 * FIX: export.test.js - "Invalid CIN format" error
 * 
 * The CIN 'EXPORTADMIN01' is rejected by the auth validation.
 * Need to find what CIN format is accepted and use it.
 * 
 * Run: node fix-export-cin.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX: export.test.js - Invalid CIN format');
console.log('='.repeat(60));

// ── STEP 1: Find CIN validation in auth code ───────────────────
console.log('\nSTEP 1: Finding CIN validation pattern...');

// Search authController for CIN validation
const authCtrlPath = `${PROJECT}/src/controllers/authController.js`;
if (fs.existsSync(authCtrlPath)) {
  const authCode = fs.readFileSync(authCtrlPath, 'utf8');
  
  // Find CIN-related validation
  const cinLines = authCode.split('\n').filter(l => 
    l.toLowerCase().includes('cin') && 
    (l.includes('valid') || l.includes('regex') || l.includes('test') || l.includes('match') || l.includes('format') || l.includes('length'))
  );
  console.log('  CIN validation lines in authController:');
  for (const l of cinLines) console.log('    ' + l.trim());
}

// Also check authRoutes for validation middleware
const authRoutesPath = `${PROJECT}/src/routes/authRoutes.js`;
if (fs.existsSync(authRoutesPath)) {
  const routesCode = fs.readFileSync(authRoutesPath, 'utf8');
  const cinLines = routesCode.split('\n').filter(l => l.toLowerCase().includes('cin'));
  console.log('  CIN lines in authRoutes:');
  for (const l of cinLines) console.log('    ' + l.trim());
}

// Check validate middleware
const validatePath = `${PROJECT}/src/middleware/validateMiddleware.js`;
const validateAltPath = `${PROJECT}/src/middleware/validation.js`;
for (const p of [validatePath, validateAltPath]) {
  if (fs.existsSync(p)) {
    const vCode = fs.readFileSync(p, 'utf8');
    const cinLines = vCode.split('\n').filter(l => l.toLowerCase().includes('cin'));
    if (cinLines.length > 0) {
      console.log('  CIN lines in ' + p.split('/').pop() + ':');
      for (const l of cinLines) console.log('    ' + l.trim());
    }
  }
}

// ── STEP 2: Check what CINs other working tests use ────────────
console.log('\nSTEP 2: Checking CINs used in other tests...');

const testDir = `${PROJECT}/tests`;
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

for (const tf of testFiles) {
  const content = fs.readFileSync(`${testDir}/${tf}`, 'utf8');
  // Find CIN values used in tests
  const cinMatches = content.match(/cin:\s*['"]([^'"]+)['"]/g) || [];
  if (cinMatches.length > 0) {
    console.log('  ' + tf + ': ' + cinMatches.join(', '));
  }
}

// ── STEP 3: Check personnel table CIN column constraints ───────
console.log('\nSTEP 3: Checking CIN column in DB schema...');

try {
  const result = execSync(
    'docker exec vaccinikids-db psql -U vaccinikids_user -d vaccinikids -c "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = \'personnel\' AND column_name = \'cin\'"',
    { encoding: 'utf8', timeout: 10000 }
  );
  console.log('  ' + result.trim());
} catch (e) {
  console.log('  Could not query DB: ' + (e.message || '').substring(0, 100));
}

// ── STEP 4: Find the exact validation regex ────────────────────
console.log('\nSTEP 4: Searching for CIN validation regex in all files...');

try {
  const grepResult = execSync(
    'grep -rn "cin" ' + PROJECT + '/src/ --include="*.js" | grep -i "valid\\|regex\\|test\\|match\\|format\\|pattern" | head -20',
    { encoding: 'utf8', timeout: 10000 }
  );
  console.log(grepResult);
} catch (e) {
  // Try alternative search
  const srcDir = `${PROJECT}/src`;
  const allJsFiles = [];
  function findJs(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.')) findJs(dir + '/' + e.name);
        else if (e.name.endsWith('.js')) allJsFiles.push(dir + '/' + e.name);
      }
    } catch(e) {}
  }
  findJs(srcDir);
  
  for (const f of allJsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if ((line.includes('cin') || line.includes('CIN')) && 
          (line.includes('regex') || line.includes('RegExp') || line.includes('.test(') || line.includes('.match(') || line.includes('format'))) {
        console.log('  ' + f.replace(PROJECT + '/', '') + ':' + (i+1) + ': ' + line.trim());
        // Show context
        if (i > 0) console.log('    prev: ' + lines[i-1].trim());
        if (i < lines.length - 1) console.log('    next: ' + lines[i+1].trim());
      }
    }
  }
}

// ── STEP 5: Quick test - try logging in with a known CIN ───────
console.log('\nSTEP 5: Testing CIN formats...');

// Read the auth test to see what CINs it uses successfully
const authTestPath = `${PROJECT}/tests/auth.test.js`;
if (fs.existsSync(authTestPath)) {
  const authTest = fs.readFileSync(authTestPath, 'utf8');
  const cinValues = authTest.match(/cin:\s*['"]([^'"]+)['"]/g) || [];
  console.log('  Auth test CINs: ' + cinValues.join(', '));
  
  // Also find the personnel login test
  const loginSection = authTest.match(/personnel\/login[\s\S]*?describe[\s\S]*?\{[\s\S]{0,2000}/)?.[0];
  if (loginSection) {
    console.log('  Login test preview:');
    console.log('    ' + loginSection.substring(0, 500).replace(/\n/g, '\n    '));
  }
}

// ── STEP 6: Read the auth controller fully for CIN validation ──
console.log('\nSTEP 6: Full authController CIN section...');

if (fs.existsSync(authCtrlPath)) {
  const authCode = fs.readFileSync(authCtrlPath, 'utf8');
  const lines = authCode.split('\n');
  
  // Find the personnel login function
  let inLoginFunc = false;
  let loginFuncLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('personnel') && line.includes('login')) {
      inLoginFunc = true;
    }
    if (inLoginFunc) {
      loginFuncLines.push((i+1) + ': ' + line);
      if (line.trim() === '};' && loginFuncLines.length > 5) break;
    }
  }
  
  if (loginFuncLines.length > 0) {
    console.log('  Personnel login function:');
    for (const l of loginFuncLines.slice(0, 30)) {
      console.log('    ' + l);
    }
  }
}

// ── STEP 7: Apply fix based on findings ─────────────────────────
console.log('\nSTEP 7: Applying fix...');

// The safest approach: use CINs that match the pattern from other working tests
// Common patterns: 'ADMIN001', 'NURSE001', or numeric like '1234567'
// Let's check the auth test and use the same format

// For now, try with shorter alphanumeric CINs
const testPath = `${PROJECT}/tests/export.test.js`;
let testCode = fs.readFileSync(testPath, 'utf8');

// Replace CINs with ones that work (use same format as other tests)
// Try 'EXPA0001' and 'EXPN0001' - similar to other test CINs
testCode = testCode.replace(/EXPORTADMIN01/g, 'EXPA0001');
testCode = testCode.replace(/EXPORTNURSE01/g, 'EXPN0001');
testCode = testCode.replace(/ExportAdmin/g, 'ExportAdm');
testCode = testCode.replace(/ExportNurse/g, 'ExportNrs');

fs.writeFileSync(testPath, testCode);
console.log('  [OK] Updated CINs in export.test.js');

// Run export test in isolation
console.log('\n' + '='.repeat(60));
console.log('  Testing with new CINs');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/export.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 120000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  // Check for CIN errors
  if (result.includes('Invalid CIN')) {
    console.log('\n  ⚠️  Still getting "Invalid CIN" errors!');
  }
  
  // Show token warnings
  if (result.includes('EXPORT TEST:')) {
    const warnLines = result.split('\n').filter(l => l.includes('EXPORT TEST:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
  
  if (result.includes('✕')) {
    const failLines = result.split('\n').filter(l => l.includes('✕'));
    console.log('\n  Failed tests:');
    for (const f of failLines) console.log('    ' + f.trim());
  }
  
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  if (output.includes('Invalid CIN')) {
    console.log('\n  ⚠️  Still getting "Invalid CIN" errors!');
  }
  
  if (output.includes('EXPORT TEST:')) {
    const warnLines = output.split('\n').filter(l => l.includes('EXPORT TEST:'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim().substring(0, 200));
  }
}

console.log('\n' + '='.repeat(60));
console.log('  Done');
console.log('='.repeat(60));
