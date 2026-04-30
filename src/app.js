const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');

/**
 * Express Application Setup
 */
const app = express();

// ============================================
// 1. SECURITY MIDDLEWARE
// ============================================
app.use(helmet());

// ============================================
// 2. CORS CONFIGURATION
// ============================================
const corsOptions = {
  origin: config.cors.origin.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));

// ============================================
// 3. BODY PARSING
// ============================================
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// 4. LOGGING
// ============================================
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// 5. RATE LIMITING
// ============================================
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ============================================
// 6. HEALTH CHECK ROUTE
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'VacciniKids API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ============================================
// 7. API ROUTES (will be added Day 4+)
// ============================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/vaccins', require('./routes/vaccinRoutes'));

app.use('/api/rendez-vous', require('./routes/rendezVousRoutes'));
app.use('/api/vaccinations', require('./routes/vaccinationRoutes'));
app.use('/api/flacons', require('./routes/flaconRoutes'));
app.use('/api/carnet', require('./routes/carnetRoutes'));
// app.use('/api/stats', require('./routes/statsRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// ============================================
// 8. 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ============================================
// 9. GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (config.isDev) {
    console.error('🔥 Error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.isDev && { stack: err.stack }),
  });
});

module.exports = app;
