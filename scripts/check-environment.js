const environment = process.env.DEPLOY_ENV || process.env.NODE_ENV || 'development';
const protectedEnvironments = new Set(['staging', 'production']);
const localPattern = /(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2|192\.168\.)/i;
const demoPattern = /(dev-only|ci-only|change-me|example\.ma|your-)/i;

const urls = ['DATABASE_URL', 'REDIS_URL', 'SMS_API_URL', 'AUDIT_EXTERNAL_URL', 'CORS_ORIGIN'];
const optionalClientUrls = ['API_BASE_URL', 'STAFF_API_BASE_URL'];
const secrets = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_HASH_SECRET',
  'LOG_USER_HASH_SALT',
  'METRICS_BEARER_TOKEN',
];
const failures = [];

if (!['development', 'test', 'staging', 'production'].includes(environment)) {
  failures.push(`DEPLOY_ENV/NODE_ENV is invalid: ${environment}`);
}

if (protectedEnvironments.has(environment)) {
  for (const key of urls) {
    const value = process.env[key];
    if (!value) failures.push(`${key} is required in ${environment}`);
    else if (localPattern.test(value) || demoPattern.test(value)) {
      failures.push(`${key} contains a local or placeholder value`);
    }
  }

  for (const key of optionalClientUrls) {
    const value = process.env[key];
    if (value && (!value.startsWith('https://') || localPattern.test(value) || demoPattern.test(value))) {
      failures.push(`${key} must be a non-placeholder HTTPS URL`);
    }
  }

  if (!process.env.SMS_API_URL?.startsWith('https://')) failures.push('SMS_API_URL must use HTTPS');
  if (!process.env.AUDIT_EXTERNAL_URL?.startsWith('https://')) {
    failures.push('AUDIT_EXTERNAL_URL must use HTTPS');
  }
  if (!process.env.REDIS_URL?.startsWith('rediss://')) failures.push('REDIS_URL must use TLS (rediss)');
  if (
    process.env.CORS_ORIGIN?.split(',').some((origin) => !origin.trim().startsWith('https://'))
  ) {
    failures.push('Every CORS_ORIGIN must use HTTPS');
  }

  for (const key of secrets) {
    const value = process.env[key];
    if (!value) failures.push(`${key} is required in ${environment}`);
    else if (demoPattern.test(value) || value.length < 32) {
      failures.push(`${key} is a placeholder or is too short`);
    }
  }

  if (process.env.ALLOW_PROVIDER_STUBS === 'true') {
    failures.push('ALLOW_PROVIDER_STUBS must be false');
  }
  if (process.env.DATABASE_SSL_MODE !== 'verify-full') {
    failures.push('DATABASE_SSL_MODE must be verify-full');
  }
}

if (failures.length) {
  console.error(`Environment check failed for ${environment}:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.warn(`Environment check passed for ${environment}`);
