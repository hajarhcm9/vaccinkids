#!/usr/bin/env node
/**
 * EMERGENCY FIX: Restore app.js properly + fix statsDashboard
 * 
 * The previous fix-stats-definitive.js was TOO AGGRESSIVE:
 * - It removed /api/ apiLimiter (line 52) thinking it was a dup of /api/ auditMiddleware
 * - It removed /api/auth authLimiter (line 75) thinking it was a dup of /api/auth authRoutes
 * - These are NOT duplicates - they're different middleware on the same path prefix!
 * 
 * The ONLY real duplicates were:
 * - Second occurrence of app.use('/api/admin', require('./routes/adminRoutes'))
 * - Second occurrence of app.use('/api/stats', require('./routes/statsRoutes'))
 * 
 * Strategy:
 * 1. Restore app.js from git (original state with Day 21 file-attente route)
 * 2. Remove ONLY the true duplicate route registrations
 * 3. Verify statsDashboard.test.js OTP bypass is correct
 * 4. Run full test suite
 * 
 * Run: node fix-emergency-appjs.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  EMERGENCY FIX: Restore app.js + keep statsDashboard fix');
console.log('='.repeat(60));

// ── STEP 1: Restore app.js from git ────────────────────────────
console.log('\nSTEP 1: Restoring app.js from working state...');

// First, let's check what git has
try {
  // Get the current state of app.js to see what we're working with
  const currentApp = fs.readFileSync(`${PROJECT}/src/app.js`, 'utf8');
  const currentLines = currentApp.split('\n');
  console.log('  Current app.js has ' + currentLines.length + ' lines');
  
  // Check what routes are there now
  const currentRoutes = currentLines.filter(l => l.includes('app.use('));
  console.log('  Current app.use() calls: ' + currentRoutes.length);
  for (const r of currentRoutes) {
    console.log('    ' + r.trim());
  }
} catch (e) {
  console.log('  Error reading current app.js: ' + e.message);
}

// Restore from git - use the stable commit + file-attente addition
// The safest approach: restore from git, then add file-attente route
console.log('\n  Restoring app.js from git commit 18199f3...');

try {
  execSync(`git checkout 18199f3 -- src/app.js`, {
    cwd: PROJECT,
    stdio: 'pipe'
  });
  console.log('  [OK] Restored app.js from commit 18199f3');
} catch (e) {
  console.log('  [FAIL] Could not restore from git: ' + e.message);
  console.log('  Will try to reconstruct manually...');
}

// ── STEP 2: Add file-attente route back ────────────────────────
console.log('\nSTEP 2: Adding file-attente route to app.js...');

let appCode = fs.readFileSync(`${PROJECT}/src/app.js`, 'utf8');

// Check if file-attente is already there
if (appCode.includes('file-attente') || appCode.includes('fileAttente')) {
  console.log('  [OK] file-attente route already exists');
} else {
  // Add before the error handler
  const errorHandlerPattern = /app\.use\(\(err,\s*req,\s*res,\s*next\)/;
  if (errorHandlerPattern.test(appCode)) {
    appCode = appCode.replace(
      errorHandlerPattern,
      "app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));\n\napp.use((err, req, res, next)"
    );
    console.log('  [OK] Added file-attente route before error handler');
  } else {
    // Add at the end before module.exports
    const exportPattern = /module\.exports/;
    if (exportPattern.test(appCode)) {
      appCode = appCode.replace(
        exportPattern,
        "app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));\n\nmodule.exports"
      );
      console.log('  [OK] Added file-attente route before module.exports');
    } else {
      // Just append
      appCode += "\napp.use('/api/file-attente', require('./routes/fileAttenteRoutes'));\n";
      console.log('  [OK] Appended file-attente route');
    }
  }
}

// ── STEP 3: Remove ONLY true duplicate routes ──────────────────
console.log('\nSTEP 3: Removing ONLY true duplicate route registrations...');

const lines = appCode.split('\n');
const routeRegistrations = new Map(); // route -> first line index
const duplicateIndices = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Only check for require() route registrations (NOT middleware like limiters)
  // Pattern: app.use('/api/XXX', require('./routes/XXX'));
  const match = line.match(/app\.use\(\s*['"]([^'"]+)['"],\s*require\(/);
  if (match) {
    const route = match[1];
    if (routeRegistrations.has(route)) {
      duplicateIndices.push(i);
      console.log('  Found TRUE duplicate: ' + route + ' at line ' + (i+1) + ' (first at line ' + (routeRegistrations.get(route)+1) + ')');
    } else {
      routeRegistrations.set(route, i);
    }
  }
}

if (duplicateIndices.length > 0) {
  const newLines = lines.filter((_, idx) => !duplicateIndices.includes(idx));
  appCode = newLines.join('\n');
  console.log('  [OK] Removed ' + duplicateIndices.length + ' true duplicate(s)');
} else {
  console.log('  [OK] No true duplicates found');
}

fs.writeFileSync(`${PROJECT}/src/app.js`, appCode);
console.log('  [OK] Saved app.js');

// Verify final state
const finalApp = fs.readFileSync(`${PROJECT}/src/app.js`, 'utf8');
console.log('\n  Final app.use() registrations:');
for (const line of finalApp.split('\n')) {
  if (line.includes('app.use(')) {
    console.log('    ' + line.trim());
  }
}

// ── STEP 4: Check statsDashboard.test.js ───────────────────────
console.log('\nSTEP 4: Checking statsDashboard.test.js...');

const testPath = `${PROJECT}/tests/statsDashboard.test.js`;
let testCode = fs.readFileSync(testPath, 'utf8');

// Verify the '123456' bypass is there
const hasBypass = testCode.includes("code: '123456'");
const hasOldOtp = testCode.includes('const otp = await getOTP(parentPhone)');
console.log('  Has 123456 bypass: ' + hasBypass);
console.log('  Still has old getOTP: ' + hasOldOtp);

if (hasOldOtp) {
  console.log('  ⚠️  Old getOTP still present - fixing...');
  
  // Replace the entire OTP block
  // More robust: find and replace line by line
  const testLines = testCode.split('\n');
  const newTestLines = [];
  let skipUntilBrace = false;
  let braceCount = 0;
  let inOtpBlock = false;
  let replacedOtp = false;
  
  for (let i = 0; i < testLines.length; i++) {
    const line = testLines[i];
    
    // Detect start of OTP block
    if (line.includes('const otp = await getOTP(parentPhone)')) {
      inOtpBlock = true;
      // Insert the new verify block instead
      newTestLines.push("  // Use test bypass '123456' instead of fetching real OTP");
      newTestLines.push("  const verifyRes = await request(app)");
      newTestLines.push("    .post('/api/auth/parent/verify-otp')");
      newTestLines.push("    .send({ telephone: parentPhone, code: '123456', nom: 'StatsParent', prenom: 'Test' });");
      newTestLines.push("  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.accessToken;");
      newTestLines.push("  parentId = verifyRes.body.data?.parent?.id;");
      replacedOtp = true;
      continue;
    }
    
    if (inOtpBlock) {
      // Skip lines until we've passed the if(otp) block
      if (line.includes('if (otp)') || line.includes('if(otp)')) {
        skipUntilBrace = true;
        braceCount = 1; // We're inside the if
        continue;
      }
      if (skipUntilBrace) {
        // Count braces
        for (const ch of line) {
          if (ch === '{') braceCount++;
          if (ch === '}') braceCount--;
        }
        if (braceCount <= 0) {
          skipUntilBrace = false;
          inOtpBlock = false;
        }
        continue;
      }
      // If we get here without an if block, just skip the otp line
      inOtpBlock = false;
    }
    
    newTestLines.push(line);
  }
  
  if (replacedOtp) {
    testCode = newTestLines.join('\n');
    fs.writeFileSync(testPath, testCode);
    console.log('  [OK] Replaced getOTP with 123456 bypass');
  } else {
    console.log('  ⚠️  Could not replace - manual fix needed');
  }
}

// Also verify beforeAll timeout
const beforeAllTimeoutMatch = testCode.match(/beforeAll.*\},\s*(\d+)\)/s);
if (beforeAllTimeoutMatch) {
  console.log('  beforeAll timeout: ' + beforeAllTimeoutMatch[1] + 'ms');
} else {
  console.log('  beforeAll timeout: default (5000ms)');
}

// ── STEP 5: Run statsDashboard in isolation first ──────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 5: Testing statsDashboard in isolation');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest tests/statsDashboard.test.js --verbose --forceExit 2>&1',
    { cwd: PROJECT, timeout: 180000, maxBuffer: 5*1024*1024, encoding: 'utf8' }
  );
  
  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '0') + ' failed');
  
  if (result.includes('STATS TEST:')) {
    console.log('  Token warnings:');
    const warnLines = result.split('\n').filter(l => l.includes('STATS TEST:') && l.includes('undefined'));
    for (const w of warnLines) console.log('    ' + w.trim());
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/(\d+) failed/);
  console.log('  Result: ' + (passMatch ? passMatch[1] : '?') + ' passed, ' + (failMatch ? failMatch[1] : '?') + ' failed');
  
  // Show token warnings
  if (output.includes('STATS TEST:')) {
    console.log('  Token warnings:');
    const warnLines = output.split('\n').filter(l => l.includes('STATS TEST:') && l.includes('undefined'));
    for (const w of warnLines.slice(0, 3)) console.log('    ' + w.trim());
  }
  
  // Show error details
  let inError = false;
  let errorBuf = [];
  let errorCount = 0;
  for (const line of output.split('\n')) {
    if (line.trim().startsWith('●')) {
      inError = true;
      errorBuf = [];
      errorCount++;
    }
    if (inError) {
      errorBuf.push(line);
      if (line.trim() === '' && errorBuf.length > 3) {
        if (errorCount <= 3) console.log(errorBuf.join('\n'));
        inError = false;
        errorBuf = [];
      }
    }
  }
}

// ── STEP 6: Run FULL test suite ────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('  STEP 6: Running FULL test suite');
console.log('='.repeat(60));

try {
  const result = execSync(
    'npx jest --forceExit 2>&1',
    { cwd: PROJECT, timeout: 300000, maxBuffer: 10*1024*1024, encoding: 'utf8' }
  );
  
  const summary = result.split('\n').filter(l => 
    l.includes('Test Suites:') || l.includes('Tests:')
  );
  for (const s of summary) console.log('  ' + s.trim());
  
  if (result.includes('0 failed')) {
    console.log('\n  ✅ ALL TESTS PASSED!');
  } else {
    const failSuites = result.split('\n').filter(l => l.trim().startsWith('FAIL'));
    console.log('\n  Failed suites (' + failSuites.length + '):');
    for (const s of failSuites) console.log('    ' + s.trim());
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const summary = output.split('\n').filter(l => 
    l.includes('Test Suites:') || l.includes('Tests:')
  );
  for (const s of summary) console.log('  ' + s.trim());
  
  const failSuites = output.split('\n').filter(l => l.trim().startsWith('FAIL'));
  if (failSuites.length > 0) {
    console.log('\n  Failed suites (' + failSuites.length + '):');
    for (const s of failSuites) console.log('    ' + s.trim());
  }
}

console.log('\n' + '='.repeat(60));
console.log('  Done');
console.log('='.repeat(60));
