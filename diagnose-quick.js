#!/usr/bin/env node
/**
 * QUICK DIAGNOSTIC: Find the 10 failing tests
 * Run: node diagnose-quick.js
 * 
 * Just runs jest once and extracts failure info.
 */

const { execSync } = require('child_process');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('Running full test suite...\n');

let output;
try {
  output = execSync('npx jest --verbose --forceExit 2>&1', {
    cwd: PROJECT,
    timeout: 300000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8'
  });
} catch (e) {
  output = (e.stdout || '').toString();
}

const lines = output.split('\n');

// 1. Suite results
console.log('=== SUITE RESULTS ===');
for (const line of lines) {
  if (line.trim().startsWith('PASS') || line.trim().startsWith('FAIL')) {
    console.log('  ' + line.trim());
  }
}

// 2. Failing test names
console.log('\n=== FAILING TEST NAMES ===');
for (const line of lines) {
  if (line.includes('✕') || line.includes('×')) {
    console.log('  ' + line.trim());
  }
}

// 3. Summary
console.log('\n=== SUMMARY ===');
for (const line of lines) {
  if (line.includes('Test Suites:') || line.includes('Tests:') || 
      line.includes('Time:')) {
    console.log('  ' + line.trim());
  }
}

// 4. Error details - just the ● sections
console.log('\n=== ERROR DETAILS ===');
let inError = false;
let errorBuffer = [];
for (const line of lines) {
  if (line.trim().startsWith('●')) {
    inError = true;
    errorBuffer = [];
  }
  if (inError) {
    errorBuffer.push(line);
    // End of error block
    if (line.trim() === '' && errorBuffer.length > 2) {
      console.log(errorBuffer.join('\n'));
      inError = false;
      errorBuffer = [];
    }
  }
}
if (inError && errorBuffer.length > 0) {
  console.log(errorBuffer.join('\n'));
}
