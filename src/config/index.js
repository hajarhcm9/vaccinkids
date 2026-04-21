require('dotenv').config();

/**
 * Centralized application configuration
 * All settings come from environment variables with sensible defaults
 */
const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'vaccinikids',
    user: process.env.DB_USER || 'vaccinikids_user',
    password: process.env.DB_PASSWORD || 'vaccinikids_password',
    url: process.env.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // OTP
  otp: {
    length: parseInt(process.env.OTP_LENGTH, 10) || 6,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
  },

  // SMS
  sms: {
    apiKey: process.env.SMS_API_KEY || '',
    senderName: process.env.SMS_SENDER_NAME || 'VacciniKids',
    apiUrl: process.env.SMS_API_URL || 'https://api.smspartner.fr/v1/send',
  },

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
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
};

module.exports = config;