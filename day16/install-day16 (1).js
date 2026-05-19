/**
 * Day 16 - Safe install script
 * Only adds new files and patches existing ones without full replacement
 * Usage: node install-day16.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname);
const DAY16 = path.join(PROJECT, 'day16-files');

// New files to copy (these don't exist yet in the project)
const newFiles = [
  ['src_services_emailService.js', 'src/services/emailService.js'],
  ['src_services_pdfService.js', 'src/services/pdfService.js'],
  ['src_controllers_emailController.js', 'src/controllers/emailController.js'],
  ['src_controllers_pdfController.js', 'src/controllers/pdfController.js'],
  ['src_routes_emailRoutes.js', 'src/routes/emailRoutes.js'],
  ['src_routes_pdfRoutes.js', 'src/routes/pdfRoutes.js'],
  ['tests_emailPdf.test.js', 'tests/emailPdf.test.js'],
];

// Files to patch (add content, not replace)
const patches = {
  'src/utils/responseHandler.js': function(content) {
    if (content.includes('module.exports = { success, created, noContent, paginated, notFound, error }')) {
      console.log('  Already patched: responseHandler has notFound and error');
      return null; // skip
    }
    if (content.includes('notFound') && content.includes('error')) {
      console.log('  Already has notFound/error in responseHandler');
      return null;
    }
    // Add notFound and error functions before module.exports
    var additions = [
      '',
      '/**',
       ' * Not found response (404)',
       ' */',
      'const notFound = (res, message) => {',
      '  return res.status(404).json({ status: \'error\', message: message || \'Resource not found\' });',
      '};',
      '',
      '/**',
       ' * Error response',
       ' */',
      'const error = (res, message, statusCode) => {',
      '  return res.status(statusCode || 500).json({ status: \'error\', message: message || \'Internal Server Error\' });',
      '};',
      '',
    ].join('\n');

    content = content.replace(
      'module.exports = { success, created, noContent, paginated };',
      additions + 'module.exports = { success, created, noContent, paginated, notFound, error };'
    );
    return content;
  },

  'src/app.js': function(content) {
    if (content.includes('emailRoutes') && content.includes('pdfRoutes')) {
      console.log('  Already has email and PDF routes in app.js');
      return null;
    }
    // Add email and PDF routes before the 404 handler
    var routeLines = [
      'app.use(\'/api/emails\', require(\'./routes/emailRoutes\'));',
      'app.use(\'/api/pdf\', require(\'./routes/pdfRoutes\'));',
    ].join('\n');

    // Find the 404 handler and insert before it
    if (content.includes('// 404')) {
      content = content.replace('// 404', '// Day 16 - Email & PDF Routes\n' + routeLines + '\n\n// 404');
    } else if (content.includes('app.use((req, res)')) {
      content = content.replace('app.use((req, res)', '// Day 16 - Email & PDF Routes\n' + routeLines + '\n\napp.use((req, res)');
    } else {
      console.log('  WARNING: Could not find insertion point in app.js');
      return null;
    }
    return content;
  },

  'src/config/index.js': function(content) {
    if (content.includes('email:')) {
      console.log('  Already has email config in config/index.js');
      return null;
    }
    // Add isTest flag
    if (!content.includes('isTest')) {
      content = content.replace(
        'isProd: process.env.NODE_ENV === \'production\',',
        'isProd: process.env.NODE_ENV === \'production\',\n  isTest: process.env.NODE_ENV === \'test\','
      );
    }
    // Add email config after SMS section
    var emailConfig = [
      '',
      '  // Email',
      '  email: {',
      '    host: process.env.EMAIL_HOST || \'smtp.ethereal.email\',',
      '    port: parseInt(process.env.EMAIL_PORT, 10) || 587,',
      '    secure: process.env.EMAIL_SECURE === \'true\',',
      '    user: process.env.EMAIL_USER || \'\',',
      '    password: process.env.EMAIL_PASSWORD || \'\',',
      '    from: process.env.EMAIL_FROM || \'"VacciniKids" <noreply@vaccinikids.ma>\',',
      '  },',
    ].join('\n');

    if (content.includes('// Firebase')) {
      content = content.replace('// Firebase', emailConfig + '\n  // Firebase');
    } else {
      console.log('  WARNING: Could not find Firebase section in config');
      return null;
    }
    return content;
  }
};

function ensureDir(filePath) {
  var dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('  Created directory: ' + dir);
  }
}

console.log('=== VacciniKids Day 16 - Safe Installation ===\n');

var okCount = 0;
var skipCount = 0;
var failCount = 0;

// Step 1: Copy new files
console.log('--- Step 1: Copying new files ---');
newFiles.forEach(function(pair) {
  var srcName = pair[0];
  var destRel = pair[1];
  var srcPath = path.join(DAY16, srcName);
  var destPath = path.join(PROJECT, destRel);

  try {
    if (!fs.existsSync(srcPath)) {
      console.log('SKIP (source missing): ' + srcName);
      skipCount++;
      return;
    }

    ensureDir(destPath);
    fs.copyFileSync(srcPath, destPath);
    console.log('OK: ' + destRel);
    okCount++;
  } catch (err) {
    console.log('FAIL: ' + destRel + ' -> ' + err.message);
    failCount++;
  }
});

// Step 2: Patch existing files
console.log('\n--- Step 2: Patching existing files ---');
Object.keys(patches).forEach(function(relPath) {
  var filePath = path.join(PROJECT, relPath);
  try {
    if (!fs.existsSync(filePath)) {
      console.log('SKIP: ' + relPath + ' does not exist yet');
      skipCount++;
      return;
    }

    var content = fs.readFileSync(filePath, 'utf8');
    var patched = patches[relPath](content);

    if (patched === null) {
      skipCount++;
      return;
    }

    fs.writeFileSync(filePath, patched, 'utf8');
    console.log('PATCHED: ' + relPath);
    okCount++;
  } catch (err) {
    console.log('FAIL: ' + relPath + ' -> ' + err.message);
    failCount++;
  }
});

console.log('\n=== Result: ' + okCount + ' ok, ' + skipCount + ' skipped, ' + failCount + ' failed ===');
console.log('\nNext steps:');
console.log('1. Run: npx jest emailPdf --no-coverage --verbose');
console.log('2. Run: npx jest --no-coverage --verbose  (full suite)');
