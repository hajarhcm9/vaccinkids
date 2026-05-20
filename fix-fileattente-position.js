#!/usr/bin/env node
/**
 * QUICK FIX: Move file-attente route BEFORE the 404 handler
 * 
 * The file-attente route was placed AFTER the catch-all 404 handler,
 * so it was never reached. This script moves it before.
 * 
 * Run: node fix-fileattente-position.js
 */

const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('='.repeat(60));
console.log('  FIX: Move file-attente route before 404 handler');
console.log('='.repeat(60));

const appPath = `${PROJECT}/src/app.js`;
let appCode = fs.readFileSync(appPath, 'utf8');

// The problem: file-attente is after the 404 handler
// We need to:
// 1. Remove the file-attente line from its current position
// 2. Insert it before the 404 handler

const fileAttenteLine = "app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));";

if (!appCode.includes(fileAttenteLine)) {
  console.log('ERROR: file-attente line not found in app.js');
  process.exit(1);
}

// Remove the file-attente line from current position
appCode = appCode.replace(fileAttenteLine + '\n', '');
appCode = appCode.replace('\n' + fileAttenteLine, '');

// Now insert it before the 404 handler: app.use((req, res) => {
const catchAll404 = "app.use((req, res) => {";
if (appCode.includes(catchAll404)) {
  appCode = appCode.replace(
    catchAll404,
    fileAttenteLine + '\n\n' + catchAll404
  );
  console.log('[OK] Moved file-attente route before 404 handler');
} else {
  // Fallback: insert before error handler
  const errorHandler = "app.use((err, req, res, next) => {";
  if (appCode.includes(errorHandler)) {
    appCode = appCode.replace(
      errorHandler,
      fileAttenteLine + '\n\n' + errorHandler
    );
    console.log('[OK] Moved file-attente route before error handler');
  } else {
    // Last resort: add at the end
    appCode += '\n' + fileAttenteLine + '\n';
    console.log('[OK] Appended file-attente route at end');
  }
}

fs.writeFileSync(appPath, appCode);

// Verify the order
const lines = appCode.split('\n');
console.log('\nVerification - route order around 404:');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('file-attente') || line.includes('(req, res)') || line.includes('(err, req')) {
    console.log('  Line ' + (i+1) + ': ' + line.trim());
  }
}

// Run full test suite
console.log('\n' + '='.repeat(60));
console.log('  Running FULL test suite');
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
  
  const failSuites = result.split('\n').filter(l => l.trim().startsWith('FAIL'));
  if (failSuites.length > 0) {
    console.log('\n  Failed suites:');
    for (const s of failSuites) console.log('    ' + s.trim());
  } else {
    console.log('\n  ✅ ALL TESTS PASSED!');
  }
} catch (e) {
  const output = (e.stdout || '').toString();
  const summary = output.split('\n').filter(l => 
    l.includes('Test Suites:') || l.includes('Tests:')
  );
  for (const s of summary) console.log('  ' + s.trim());
  
  const failSuites = output.split('\n').filter(l => l.trim().startsWith('FAIL'));
  if (failSuites.length > 0) {
    console.log('\n  Failed suites:');
    for (const s of failSuites) console.log('    ' + s.trim());
    
    // Show failing test names
    const failTests = output.split('\n').filter(l => l.includes('✕'));
    if (failTests.length > 0) {
      console.log('\n  Failed tests:');
      for (const t of failTests.slice(0, 15)) console.log('    ' + t.trim());
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('  Done');
console.log('='.repeat(60));
