const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'App.js',
  'src/services/authService.js',
  'src/services/httpClient.js',
  'src/screens/auth/OtpVerificationScreen.js',
];

const failures = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (/AsyncStorage.*(?:access|refresh|auth|fcm).*token/i.test(content)) {
    failures.push(`${file}: token stored in AsyncStorage`);
  }
  if (/console\.(?:log|warn|error)\([^)]*(?:otp|token|phone|telephone)/i.test(content)) {
    failures.push(`${file}: sensitive value may be logged`);
  }
}

const androidActivity = fs.readFileSync(
  path.join(root, 'android/app/src/main/java/ma/vaccinikids/parent/MainActivity.kt'),
  'utf8',
);
if (!androidActivity.includes('FLAG_SECURE')) failures.push('Android screenshot protection missing');

const androidManifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
if (!androidManifest.includes('android:allowBackup="false"')) {
  failures.push('Android backups must be disabled');
}

if (failures.length) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.warn('Parent mobile security checks passed');
