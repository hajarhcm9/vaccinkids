const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const checks = [
  ['android/app/build.gradle', /com\.projetetemp|applicationId\s+"com\.example/i],
  ['android/app/src/main/res/values/strings.xml', /ProjeteTemp/i],
  ['app/build.gradle.kts', /applicationId\s*=\s*"com\.example/i],
  ['ios/Podfile', /ProjeteTemp/i],
  ['ios/VacciniKids/Info.plist', /ProjeteTemp|NSLocationWhenInUseUsageDescription/i],
  ['index.js', /ProjeteTemp/i],
  ['public/admin/admin.js', /localStorage|refreshToken/i],
  ['public/waiting-room/display.js', /localStorage|personnel\/login/i],
];

const failures = checks.filter(([file, pattern]) =>
  pattern.test(fs.readFileSync(path.join(root, file), 'utf8')),
);

if (failures.length > 0) {
  for (const [file] of failures) console.error(`Release identity/security check failed: ${file}`);
  process.exit(1);
}

console.warn('Release identity and web token storage checks passed');
