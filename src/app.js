const express = require('express');
const setupSecurity = require('./middleware/security');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const swaggerUi = require('swagger-ui-express');
const specOpenAPI = require('./config/swagger');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');

/**
 * Express Application Setup
 */
const app = express();

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
if (process.env.NODE_ENV !== 'test') app.use('/api/', apiLimiter);

app.use('/api/', require('./middleware/auditMiddleware'));

// ============================================
// 6. API DOCUMENTATION (Swagger)
// ============================================
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specOpenAPI));

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

// ============================================
// 8. API ROUTES
// ============================================
if (process.env.NODE_ENV !== 'test') app.use('/api/auth', authLimiter);
app.use('/api/auth', require('./routes/authRoutes'));
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
app.use('/api/exports', require('./routes/exportRoutes'));
app.use('/api/file-attente', require('./routes/fileAttenteRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));

// ============================================
// 9. 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ============================================
// 10. GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (config.isDev) {
    console.error('🔤 Error:', err);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.isDev && { stack: err.stack }),
  });
});

module.exports = app;
