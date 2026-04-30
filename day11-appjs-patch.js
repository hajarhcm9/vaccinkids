/**
 * Day 11 — Integration Instructions
 * ==================================
 *
 * 1. In src/app.js, add this route in section 7 (API ROUTES):
 *
 *    app.use('/api/notifications', require('./routes/notificationRoutes'));
 *
 *
 * 2. In src/server.js, add after the migration runner (after runMigrations):
 *
 *    const Notification = require('./models/Notification');
 *    await Notification.initTable();
 *
 *    Then after server.listen callback, add:
 *
 *    const reminderService = require('./services/reminderService');
 *    if (process.env.NODE_ENV !== 'test') {
 *      reminderService.start();
 *    }
 *
 *    And in the shutdown handler, before pool.end():
 *
 *    reminderService.stop();
 *
 *
 * 3. The migration file is at:
 *    src/models/migrations/003_add_notification.sql
 *    It will be run automatically by the migrationRunner on next server start.
 */

module.exports = {};
