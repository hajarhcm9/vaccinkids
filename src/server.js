const app = require('./app');
const config = require('./config');
const { pool } = require('./config/database');

/**
 * VacciniKids Backend Server
 */
async function startServer() {
  try {
    // 1. Test database connection
    await pool.query('SELECT NOW()');
    console.warn('✅ Database connection verified');

    // 2. Start Express server
    const PORT = config.port;
    const server = app.listen(PORT, () => {
      console.warn(`
  ╔══════════════════════════════════════════╗
  ║     🌱 VacciniKids API Server           ║
  ║     Running on http://localhost:${PORT}    ║
  ║     Environment: ${config.nodeEnv}          ║
  ╚══════════════════════════════════════════╝
      `);
    });

    // 3. Graceful shutdown
    const shutdown = async (signal) => {
      console.warn(`\n⛔ ${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.warn('✅ HTTP server closed');
      });
      await pool.end();
      console.warn('✅ Database pool closed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();