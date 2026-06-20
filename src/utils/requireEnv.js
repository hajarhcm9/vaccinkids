'use strict';

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: ${key} must be set in environment`);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && value.startsWith('dev-only-')) {
    console.error(`FATAL: ${key} must not use dev-only values in production`);
    process.exit(1);
  }
  if (process.env.NODE_ENV !== 'production' && value.startsWith('dev-only-')) {
    console.log(`WARNING: ${key} uses a dev-only value. Change it before production.`);
  }
  return value;
}

module.exports = requireEnv;
