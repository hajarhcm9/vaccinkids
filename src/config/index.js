require('dotenv').config({ quiet: true });

function requireEnv(key) {
  var value = process.env[key];
  if (!value) {
    console.error('FATAL: ' + key + ' must be set in environment');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production' && value.indexOf('dev-only-') === 0) {
    console.error('FATAL: ' + key + ' must not use dev-only values in production');
    process.exit(1);
  }
  if (process.env.NODE_ENV !== 'production' && value.indexOf('dev-only-') === 0) {
    console.warn('WARNING: ' + key + ' uses a dev-only value. Change it before production.');
  }
  return value;
}

function getOtpHashSecret() {
  if (process.env.OTP_HASH_SECRET) return requireEnv('OTP_HASH_SECRET');
  if (process.env.NODE_ENV === 'production') return requireEnv('OTP_HASH_SECRET');

  console.warn('WARNING: OTP_HASH_SECRET is not set. Using the development-only fallback.');
  return 'dev-only-otp-hash-secret-change-before-production';
}

/**
 * Centralized application configuration
 * Security-sensitive settings must come from environment variables.
 */
const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'vaccinikids',
    user: process.env.DATABASE_URL ? process.env.DB_USER || '' : requireEnv('DB_USER'),
    password: process.env.DATABASE_URL ? process.env.DB_PASSWORD || '' : requireEnv('DB_PASSWORD'),
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // OTP
  otp: {
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5,
    hashSecret: getOtpHashSecret(),
  },

  // SMS
  sms: {
    provider: process.env.SMS_PROVIDER || 'generic',
    apiKey: process.env.SMS_API_KEY || '',
    senderName: process.env.SMS_SENDER_NAME || 'VacciniKids',
    apiUrl: process.env.SMS_API_URL || 'https://api.smspartner.fr/v1/send',
    authScheme: process.env.SMS_AUTH_SCHEME || 'Bearer',
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || '"VacciniKids" <noreply@vaccinikids.ma>',
  },
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  swaggerEnabled: process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production',
};

module.exports = config;
