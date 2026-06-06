const { pool, describeDbError } = require('../config/database');
const reminderService = require('../services/reminderService');

async function startWorker() {
  try {
    await pool.query('SELECT 1');
    reminderService.start();
    console.warn('Reminder worker is running');
  } catch (error) {
    console.error('Failed to start reminder worker:', describeDbError(error));
    process.exit(1);
  }
}

const shutdown = async (signal) => {
  console.warn(`${signal} received. Stopping reminder worker...`);
  reminderService.stop();
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startWorker();
