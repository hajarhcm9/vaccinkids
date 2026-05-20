'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT = '/Users/macos/Desktop/vaccinikids/vaccinkids';

console.log('============================================================');
console.log('  DIAGNOSE: app.js current state');
console.log('============================================================\n');

const appJs = fs.readFileSync(path.join(PROJECT, 'src', 'app.js'), 'utf8');

// Show all require/import lines
const lines = appJs.split('\n');
console.log('ALL LINES IN APP.JS:\n');
lines.forEach((line, i) => {
  console.log(`  ${i + 1}: ${line}`);
});

console.log('\n============================================================');
console.log('  RATE LIMITER');
console.log('============================================================\n');

const rateLimiter = fs.readFileSync(path.join(PROJECT, 'src', 'middleware', 'rateLimiter.js'), 'utf8');
console.log(rateLimiter);

console.log('\n============================================================');
console.log('  AUTH ROUTES');
console.log('============================================================\n');

const authRoutes = fs.readFileSync(path.join(PROJECT, 'src', 'routes', 'authRoutes.js'), 'utf8');
console.log(authRoutes);

console.log('\n============================================================');
console.log('  AUTH CONTROLLER - first 50 lines');
console.log('============================================================\n');

const authCtrl = fs.readFileSync(path.join(PROJECT, 'src', 'controllers', 'authController.js'), 'utf8');
authCtrl.split('\n').slice(0, 50).forEach((line, i) => {
  console.log(`  ${i + 1}: ${line}`);
});
