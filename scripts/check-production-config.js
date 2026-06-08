const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_HASH_SECRET',
  'LOG_USER_HASH_SALT',
  'REDIS_URL',
  'SMS_API_KEY',
  'SMS_API_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'AUDIT_EXTERNAL_URL',
  'AUDIT_EXTERNAL_SECRET',
  'METRICS_BEARER_TOKEN',
  'CORS_ORIGIN',
];

const missing = required.filter((key) => !process.env[key]);
const insecureUrls = ['DATABASE_URL', 'REDIS_URL', 'SMS_API_URL', 'AUDIT_EXTERNAL_URL'].filter(
  (key) => process.env[key]?.includes('localhost'),
);
const invalidSurfaceFlags = ['WEB_ADMIN_ENABLED', 'WAITING_ROOM_ENABLED'].filter(
  (key) => !['true', 'false'].includes(process.env[key]),
);
const invalidSurfaceDurations = [
  ['WEB_ADMIN_SESSION_DAYS', 7],
  ['KIOSK_TOKEN_MINUTES', 15],
].filter(([key, max]) => {
  const value = Number.parseInt(process.env[key], 10);
  return !Number.isInteger(value) || value < 1 || value > max;
});

if (process.env.ALLOW_PROVIDER_STUBS === 'true') {
  console.error('Production configuration must not allow provider stubs');
  process.exitCode = 1;
}
if (missing.length) {
  console.error(`Missing production configuration: ${missing.join(', ')}`);
  process.exitCode = 1;
}
if (insecureUrls.length) {
  console.error(`Production configuration contains local URLs: ${insecureUrls.join(', ')}`);
  process.exitCode = 1;
}
if (invalidSurfaceFlags.length) {
  console.error(
    `Production surface flags must be explicit true/false: ${invalidSurfaceFlags.join(', ')}`,
  );
  process.exitCode = 1;
}
if (invalidSurfaceDurations.length) {
  console.error(
    `Production surface durations are missing or excessive: ${invalidSurfaceDurations
      .map(([key]) => key)
      .join(', ')}`,
  );
  process.exitCode = 1;
}
if (!process.exitCode) console.warn('Production configuration checks passed');
