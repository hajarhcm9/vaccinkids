const express = require('express');
const setupSecurity = require('./middleware/security');
const {
  apiLimiter,
  otpLimiter,
  loginLimiter,
  refreshLimiter,
  exportLimiter,
  kioskLimiter,
} = require('./middleware/rateLimiter');
const swaggerUi = require('swagger-ui-express');
const specOpenAPI = require('./config/swagger');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const path = require('path');
const { pool } = require('./config/database');

/**
 * Express Application Setup
 */
const app = express();
app.set('trust proxy', config.trustProxy);
app.use(require('./middleware/requestContext'));

// ============================================
// 1. SECURITY MIDDLEWARE
// ============================================
setupSecurity(app);

// ============================================
// 2. CORS CONFIGURATION
// ============================================
const corsOptions = {
  origin: config.cors.origin.split(','),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID'],
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
if (process.env.NODE_ENV !== 'test' && config.isDev) {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============================================
// 5. RATE LIMITING
// ============================================
if (process.env.NODE_ENV !== 'test') app.use('/api/', apiLimiter);

app.use('/api/', require('./middleware/auditMiddleware'));

// ============================================
// 6. API DOCUMENTATION (Swagger)
// ============================================
if (config.swaggerEnabled) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specOpenAPI));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specOpenAPI));
}

// ============================================
// 7. HEALTH CHECK ROUTE
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'VacciniKids API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'success', message: 'VacciniKids API is ready' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database is unavailable' });
  }
});

app.get('/metrics', async (req, res) => {
  if (!config.metrics.token || req.get('authorization') !== `Bearer ${config.metrics.token}`) {
    return res.status(404).json({ status: 'error', message: 'Route not found' });
  }
  const { registry } = require('./services/metricsService');
  res.setHeader('Content-Type', registry.contentType);
  return res.send(await registry.metrics());
});

// ============================================
// 8. ADMIN WEB INTERFACE
// ============================================
if (config.surfaces.webAdminEnabled) {
  app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
}
if (config.surfaces.waitingRoomEnabled) {
  app.use('/waiting-room', express.static(path.join(__dirname, '..', 'public', 'waiting-room')));
}

// ============================================
// 9. API ROUTES
// ============================================
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth/parent/send-otp', otpLimiter);
  app.use('/api/auth/personnel/login', loginLimiter);
  app.use('/api/auth/web-admin/login', loginLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api/auth/web-admin/refresh', refreshLimiter);
}
app.use('/api/auth', require('./routes/authRoutes'));
if (process.env.NODE_ENV !== 'test') app.use('/api/kiosks/login', loginLimiter);
app.use('/api/kiosks', require('./routes/kioskRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/vaccins', require('./routes/vaccinRoutesFull'));
app.use('/api/rendez-vous', require('./routes/rendezVousRoutes'));
app.use('/api/vaccinations', require('./routes/vaccinationRoutes'));
app.use('/api/flacons', require('./routes/flaconRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/carnet', require('./routes/carnetRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/statistiques', require('./routes/statistiqueRoutes'));
app.use('/api/absenteisme', require('./routes/absenteeismRoutes'));
app.use('/api/alertes-retard', require('./routes/delayAlertRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/recherche', require('./routes/rechercheRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/pdf', require('./routes/pdfRoutes'));
if (process.env.NODE_ENV !== 'test') app.use('/api/exports', exportLimiter);
app.use('/api/exports', require('./routes/exportRoutes'));
if (process.env.NODE_ENV !== 'test') app.use('/api/file-attente/kiosk', kioskLimiter);
app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));

// ============================================
// 10. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ============================================
// 11. GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isInternal = statusCode >= 500;
  const message =
    isInternal && !config.isDev ? 'Internal Server Error' : err.message || 'Internal Server Error';

  if (isInternal) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request_failed',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message: err.message,
        stack: config.isDev ? err.stack : undefined,
      }),
    );
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.isDev && { stack: err.stack }),
  });
});

module.exports = app;
