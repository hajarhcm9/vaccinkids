const app = require('./app');
const config = require('./config');
const { pool, describeDbError } = require('./config/database');

const DB_RETRY_ATTEMPTS = parseInt(process.env.DB_RETRY_ATTEMPTS, 10) || 5;
const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS, 10) || 2000;

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function verifyDatabaseConnection() {
  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      console.warn('✅ Database connection verified');
      return;
    } catch (error) {
      const isLastAttempt = attempt === DB_RETRY_ATTEMPTS;
      console.error(
        `❌ Database connection attempt ${attempt}/${DB_RETRY_ATTEMPTS} failed: ${describeDbError(error)}`,
      );

      if (isLastAttempt) throw error;
      await wait(DB_RETRY_DELAY_MS);
    }
  }
}

/**
 * VacciniKids Backend Server
 */
async function startServer() {
  try {
    // 1. Test database connection
    await verifyDatabaseConnection();

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
    console.error('❌ Failed to start server:', describeDbError(error));
    process.exit(1);
  }
}

startServer();
