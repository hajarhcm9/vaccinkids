/**
 * gen-day11.js — Day 11: Notification System Generator (CORRECTED)
 * Run: node gen-day11.js
 *
 * Generates Day 11 files for the VacciniKids project.
 * Adapted to match the ACTUAL project structure:
 *   - authMiddleware.js (not auth.js)
 *   - rbacMiddleware.js (not authorize from auth.js)
 *   - validationMiddleware.js with custom schemas (NOT Joi)
 *   - smsService.js already exists → notificationService uses it
 *   - paginated() exists in responseHandler.js
 *   - Migrations go in src/models/migrations/
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname);

function writeFile(relativePath, content) {
  const filePath = path.join(BASE_DIR, relativePath);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content.trim() + '\n');
  console.log('  ✅  Created: ' + relativePath);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1.  src/models/Notification.js
// ═══════════════════════════════════════════════════════════════════════════════
const notificationModel = `
const { pool } = require('../config/database');

class Notification {
  /**
   * Create the notification table if it does not exist yet.
   */
  static async initTable() {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS notification (
        id SERIAL PRIMARY KEY,
        destinataire_id INTEGER NOT NULL,
        destinataire_type VARCHAR(20) NOT NULL DEFAULT 'parent',
        type VARCHAR(50) NOT NULL,
        canal VARCHAR(20) NOT NULL DEFAULT 'in_app',
        titre VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        lu BOOLEAN DEFAULT FALSE,
        envoye BOOLEAN DEFAULT FALSE,
        date_envoi TIMESTAMP,
        reference_id INTEGER,
        reference_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_notification_destinataire
        ON notification(destinataire_id, destinataire_type);

      CREATE INDEX IF NOT EXISTS idx_notification_type
        ON notification(type);

      CREATE INDEX IF NOT EXISTS idx_notification_lu
        ON notification(destinataire_id, lu);
    \`);
  }

  static async create({
    destinataire_id,
    type,
    canal = 'in_app',
    titre,
    message,
    reference_id = null,
    reference_type = null,
    destinataire_type = 'parent',
  }) {
    const sql = \`
      INSERT INTO notification
        (destinataire_id, destinataire_type, type, canal, titre, message, reference_id, reference_type, date_envoi)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    \`;
    const values = [
      destinataire_id,
      destinataire_type,
      type,
      canal,
      titre,
      message,
      reference_id,
      reference_type,
    ];
    const { rows } = await pool.query(sql, values);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM notification WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async findByDestinataire(
    destinataire_id,
    { page = 1, limit = 20, non_seulement = false, destinataire_type = 'parent' } = {}
  ) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE destinataire_id = $1 AND destinataire_type = $2';
    const params = [destinataire_id, destinataire_type];

    if (non_seulement) {
      whereClause += ' AND lu = FALSE';
    }

    const countSql = \`SELECT COUNT(*)::int AS total FROM notification \${whereClause}\`;
    const dataSql = \`
      SELECT * FROM notification \${whereClause}
      ORDER BY created_at DESC
      LIMIT $\{params.length + 1} OFFSET $\{params.length + 2}
    \`;

    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(dataSql, [
      ...params,
      limit,
      offset,
    ]);

    return {
      rows: dataResult.rows,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  static async markAsRead(id) {
    const { rows } = await pool.query(
      \`UPDATE notification SET lu = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *\`,
      [id]
    );
    return rows[0] || null;
  }

  static async markAllAsRead(destinataire_id, destinataire_type = 'parent') {
    const { rowCount } = await pool.query(
      \`UPDATE notification SET lu = TRUE, updated_at = NOW()
       WHERE destinataire_id = $1 AND destinataire_type = $2 AND lu = FALSE\`,
      [destinataire_id, destinataire_type]
    );
    return rowCount;
  }

  static async countUnread(destinataire_id, destinataire_type = 'parent') {
    const { rows } = await pool.query(
      \`SELECT COUNT(*)::int AS count FROM notification
       WHERE destinataire_id = $1 AND destinataire_type = $2 AND lu = FALSE\`,
      [destinataire_id, destinataire_type]
    );
    return rows[0].count;
  }

  static async deleteOld(daysOld) {
    const { rowCount } = await pool.query(
      \`DELETE FROM notification WHERE created_at < NOW() - ($1 || ' days')::INTERVAL\`,
      [daysOld]
    );
    return rowCount;
  }

  static async markAsSent(id) {
    const { rows } = await pool.query(
      \`UPDATE notification SET envoye = TRUE, date_envoi = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *\`,
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = Notification;
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 2.  src/services/notificationService.js
//    (uses the EXISTING smsService.js — does NOT overwrite it)
// ═══════════════════════════════════════════════════════════════════════════════
const notificationService = `
const Notification = require('../models/Notification');
const SmsService = require('./smsService');
const { pool } = require('../config/database');

/**
 * Higher-level notification service.
 * Persists notification records and dispatches them via the appropriate channel.
 * Uses the existing SmsService from the project.
 */
class NotificationService {
  // ─── Generic ──────────────────────────────────────────────────────────────

  async sendNotification({
    destinataire_id,
    type,
    canal = 'in_app',
    titre,
    message,
    reference_id = null,
    reference_type = null,
    destinataire_type = 'parent',
    phone = null,
  }) {
    // 1. Persist the notification
    const notification = await Notification.create({
      destinataire_id,
      destinataire_type,
      type,
      canal,
      titre,
      message,
      reference_id,
      reference_type,
    });

    // 2. Dispatch via the requested channel
    let sent = false;
    try {
      if (canal === 'sms' && phone) {
        const result = await SmsService.sendSMS(phone, message);
        sent = result.success === true;
      } else if (canal === 'in_app') {
        sent = true;
      }
    } catch (err) {
      console.error('[NotificationService] Dispatch error:', err.message);
    }

    // 3. Update envoye flag
    if (sent) {
      await Notification.markAsSent(notification.id);
      notification.envoye = true;
      notification.date_envoi = new Date();
    }

    return notification;
  }

  // ─── Convenience helpers ──────────────────────────────────────────────────

  async _getParentPhone(parentId) {
    const { rows } = await pool.query(
      'SELECT telephone FROM parent WHERE id = $1',
      [parentId]
    );
    return rows[0]?.telephone || null;
  }

  async _getPersonnelPhone(personnelId) {
    const { rows } = await pool.query(
      'SELECT telephone FROM personnel WHERE id = $1',
      [personnelId]
    );
    return rows[0]?.telephone || null;
  }

  async sendRappelRdv(rendezVous) {
    const phone = await this._getParentPhone(rendezVous.parent_id);
    const dateStr = new Date(rendezVous.date_heure).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    return this.sendNotification({
      destinataire_id: rendezVous.parent_id,
      destinataire_type: 'parent',
      type: 'RAPPEL_RDV',
      canal: 'sms',
      titre: 'Rappel de rendez-vous',
      message: \`Rappel: vous avez un rendez-vous de vaccination le \${dateStr}.\`,
      reference_id: rendezVous.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }

  async sendAbsenceNotification(rendezVous) {
    const phone = await this._getParentPhone(rendezVous.parent_id);
    const dateStr = new Date(rendezVous.date_heure).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    return this.sendNotification({
      destinataire_id: rendezVous.parent_id,
      destinataire_type: 'parent',
      type: 'ABSENCE',
      canal: 'sms',
      titre: 'Absence au rendez-vous',
      message: \`Votre rendez-vous du \${dateStr} a ete marque comme absent. Merci de reprendre rendez-vous.\`,
      reference_id: rendezVous.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }

  async sendConfirmationRdv(rendezVous) {
    const phone = await this._getParentPhone(rendezVous.parent_id);
    const dateStr = new Date(rendezVous.date_heure).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    return this.sendNotification({
      destinataire_id: rendezVous.parent_id,
      destinataire_type: 'parent',
      type: 'CONFIRMATION',
      canal: 'sms',
      titre: 'Confirmation de rendez-vous',
      message: \`Votre rendez-vous de vaccination est confirme pour le \${dateStr}.\`,
      reference_id: rendezVous.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }

  async sendAlerteStock(centreId, vaccinNom, quantiteRestante) {
    const { rows: nurses } = await pool.query(
      "SELECT id, telephone FROM personnel WHERE centre_id = $1 AND role = 'infirmier'",
      [centreId]
    );

    const notifications = [];
    for (const nurse of nurses) {
      const notification = await this.sendNotification({
        destinataire_id: nurse.id,
        destinataire_type: 'personnel',
        type: 'ALERTE_STOCK',
        canal: 'in_app',
        titre: 'Alerte stock vaccin',
        message: \`Stock bas: \${vaccinNom} - il reste \${quantiteRestante} dose(s) dans votre centre.\`,
        reference_type: 'stock',
        phone: nurse.telephone,
      });
      notifications.push(notification);
    }
    return notifications;
  }

  async sendRappelSession(sessionId) {
    const { rows } = await pool.query(
      'SELECT * FROM session_vaccination WHERE id = $1',
      [sessionId]
    );
    const session = rows[0];
    if (!session) return null;

    const dateStr = new Date(session.date).toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });

    const { rows: nurses } = await pool.query(
      "SELECT id, telephone FROM personnel WHERE centre_id = $1 AND role = 'infirmier'",
      [session.centre_id]
    );

    const notifications = [];
    for (const nurse of nurses) {
      const notification = await this.sendNotification({
        destinataire_id: nurse.id,
        destinataire_type: 'personnel',
        type: 'INFO',
        canal: 'in_app',
        titre: 'Rappel session de vaccination',
        message: \`Rappel: session de vaccination prevue le \${dateStr}.\`,
        reference_id: sessionId,
        reference_type: 'session',
        phone: nurse.telephone,
      });
      notifications.push(notification);
    }
    return notifications;
  }
}

module.exports = new NotificationService();
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 3.  src/services/reminderService.js
// ═══════════════════════════════════════════════════════════════════════════════
const reminderService = `
const { pool } = require('../config/database');
const notificationService = require('./notificationService');

/**
 * Cron-like service for scheduled notification jobs.
 * Uses setInterval instead of an external cron library.
 * All check methods are exposed publicly for testing/on-demand use.
 */
class ReminderService {
  constructor() {
    this.timers = [];
    this.running = false;

    this.intervals = {
      appointments: process.env.REMINDER_APPOINTMENTS_INTERVAL
        ? parseInt(process.env.REMINDER_APPOINTMENTS_INTERVAL, 10)
        : 60 * 60 * 1000,
      sessions: process.env.REMINDER_SESSIONS_INTERVAL
        ? parseInt(process.env.REMINDER_SESSIONS_INTERVAL, 10)
        : 60 * 60 * 1000,
      stock: process.env.REMINDER_STOCK_INTERVAL
        ? parseInt(process.env.REMINDER_STOCK_INTERVAL, 10)
        : 60 * 60 * 1000,
    };
  }

  start() {
    if (this.running) {
      console.warn('[ReminderService] Already running');
      return;
    }
    this.running = true;
    console.log('[ReminderService] Starting scheduled jobs...');

    this.timers.push(
      setInterval(() => {
        this.checkUpcomingAppointments().catch((err) =>
          console.error('[ReminderService] appointments error:', err.message)
        );
      }, this.intervals.appointments)
    );

    this.timers.push(
      setInterval(() => {
        this.checkTodaySessions().catch((err) =>
          console.error('[ReminderService] sessions error:', err.message)
        );
      }, this.intervals.sessions)
    );

    this.timers.push(
      setInterval(() => {
        this.checkLowStock().catch((err) =>
          console.error('[ReminderService] stock error:', err.message)
        );
      }, this.intervals.stock)
    );

    // Run once immediately on start
    this.checkUpcomingAppointments().catch(() => {});
    this.checkTodaySessions().catch(() => {});
    this.checkLowStock().catch(() => {});
  }

  stop() {
    if (!this.running) return;
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    this.running = false;
    console.log('[ReminderService] Stopped all scheduled jobs');
  }

  async checkUpcomingAppointments() {
    const { rows } = await pool.query(\`
      SELECT rv.*, p.telephone AS parent_telephone
      FROM rendez_vous rv
      JOIN parent p ON p.id = rv.parent_id
      WHERE rv.statut = 'EN_ATTENTE'
        AND rv.date_heure BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    \`);

    if (rows.length === 0) return [];

    console.log('[ReminderService] Found ' + rows.length + ' upcoming appointment(s)');

    const notifications = [];
    for (const rv of rows) {
      try {
        const notif = await notificationService.sendRappelRdv(rv);
        notifications.push(notif);
      } catch (err) {
        console.error('[ReminderService] Failed to send reminder for RDV #' + rv.id + ':', err.message);
      }
    }
    return notifications;
  }

  async checkTodaySessions() {
    const { rows } = await pool.query(\`
      SELECT * FROM session_vaccination
      WHERE date::date = CURRENT_DATE
    \`);

    if (rows.length === 0) return [];

    console.log('[ReminderService] Found ' + rows.length + ' session(s) today');

    const notifications = [];
    for (const session of rows) {
      try {
        const notifs = await notificationService.sendRappelSession(session.id);
        if (notifs) notifications.push(...notifs);
      } catch (err) {
        console.error('[ReminderService] Failed to send session reminder #' + session.id + ':', err.message);
      }
    }
    return notifications;
  }

  async checkLowStock() {
    const { rows } = await pool.query(\`
      SELECT s.*, v.nom AS vaccin_nom, s.quantite, s.seuil_alerte, s.centre_id
      FROM stock s
      JOIN vaccin v ON v.id = s.vaccin_id
      WHERE s.quantite <= s.seuil_alerte
    \`);

    if (rows.length === 0) return [];

    console.log('[ReminderService] Found ' + rows.length + ' low-stock item(s)');

    const notifications = [];
    for (const item of rows) {
      try {
        const notifs = await notificationService.sendAlerteStock(
          item.centre_id,
          item.vaccin_nom,
          item.quantite
        );
        notifications.push(...notifs);
      } catch (err) {
        console.error('[ReminderService] Failed to send stock alert:', err.message);
      }
    }
    return notifications;
  }
}

module.exports = new ReminderService();
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 4.  src/controllers/notificationController.js
//    (uses real import paths: authMiddleware, rbacMiddleware, responseHandler)
// ═══════════════════════════════════════════════════════════════════════════════
const notificationController = `
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { success, created, paginated } = require('../utils/responseHandler');

/**
 * GET /api/notifications/me
 * List the authenticated user's notifications (paginated).
 */
const getMyNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const nonSeulement = req.query.non_seulement === 'true';

  const result = await Notification.findByDestinataire(userId, {
    page,
    limit,
    non_seulement: nonSeulement,
    destinataire_type: destinataireType,
  });

  return paginated(res, result.rows, result.total, result.page, result.limit);
});

/**
 * GET /api/notifications/unread-count
 * Count unread notifications for the authenticated user.
 */
const getUnreadCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const count = await Notification.countUnread(userId, destinataireType);

  return success(res, 200, 'Unread count retrieved', { count });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const notification = await Notification.findById(id);
  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  if (notification.destinataire_id !== userId || notification.destinataire_type !== destinataireType) {
    throw ApiError.forbidden('You can only mark your own notifications as read');
  }

  const updated = await Notification.markAsRead(id);
  return success(res, 200, 'Notification marked as read', updated);
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const destinataireType = req.user.role === 'parent' ? 'parent' : 'personnel';

  const count = await Notification.markAllAsRead(userId, destinataireType);
  return success(res, 200, 'All notifications marked as read', { updated: count });
});

/**
 * POST /api/notifications/send
 * Admin or nurse sends a manual notification.
 */
const sendManual = catchAsync(async (req, res) => {
  const { destinataire_id, type, canal, titre, message, reference_id, reference_type } = req.body;
  const destinataire_type = req.body.destinataire_type || 'parent';

  const notification = await notificationService.sendNotification({
    destinataire_id,
    type,
    canal,
    titre,
    message,
    reference_id,
    reference_type,
    destinataire_type,
  });

  return created(res, 'Notification sent successfully', notification);
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  sendManual,
};
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 5.  src/routes/notificationRoutes.js
//    (uses REAL import paths matching the project)
// ═══════════════════════════════════════════════════════════════════════════════
const notificationRoutes = `
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { validate, schemas } = require('../middleware/validationMiddleware');
const notificationController = require('../controllers/notificationController');

// Merge notification schemas into the main schemas object
const notificationSchemas = require('../validators/notificationValidator');
Object.assign(schemas, notificationSchemas);

/**
 * @route   GET /api/notifications/me
 * @desc    Get the authenticated user's notifications (paginated)
 * @access  Parent
 */
router.get(
  '/me',
  authenticate,
  authorize('parent'),
  notificationController.getMyNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Parent
 */
router.get(
  '/unread-count',
  authenticate,
  authorize('parent'),
  notificationController.getUnreadCount
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Parent
 */
router.patch(
  '/:id/read',
  authenticate,
  authorize('parent'),
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Parent
 */
router.patch(
  '/read-all',
  authenticate,
  authorize('parent'),
  notificationController.markAllRead
);

/**
 * @route   POST /api/notifications/send
 * @desc    Send a manual notification (admin/infirmier only)
 * @access  Infirmier, Admin
 */
router.post(
  '/send',
  authenticate,
  authorize('infirmier', 'admin'),
  validate(schemas.notificationSend),
  notificationController.sendManual
);

module.exports = router;
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 6.  src/validators/notificationValidator.js
//    (uses the CUSTOM validation format, NOT Joi)
// ═══════════════════════════════════════════════════════════════════════════════
const notificationValidator = `
/**
 * Notification validation schemas.
 * Uses the project's custom validation format (not Joi).
 * Merged into main schemas in notificationRoutes.js via Object.assign.
 */
module.exports = {
  notificationSend: {
    destinataire_id: {
      type: 'integer',
      required: true,
    },
    destinataire_type: {
      type: 'string',
      enum: ['parent', 'personnel'],
      default: 'parent',
    },
    type: {
      type: 'string',
      required: true,
      enum: ['RAPPEL_RDV', 'ABSENCE', 'ALERTE_STOCK', 'CONFIRMATION', 'INFO'],
    },
    canal: {
      type: 'string',
      enum: ['sms', 'email', 'push', 'in_app'],
      default: 'in_app',
    },
    titre: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255,
    },
    message: {
      type: 'string',
      required: true,
      minLength: 1,
    },
    reference_id: {
      type: 'integer',
    },
    reference_type: {
      type: 'string',
      enum: ['rendez_vous', 'flacon', 'stock', 'session'],
    },
  },
};
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 7.  src/models/migrations/003_add_notification.sql
//    (placed in the project's real migration directory)
// ═══════════════════════════════════════════════════════════════════════════════
const migrationSQL = `
-- ============================================================
-- Day 11 — Notification system migration
-- ============================================================

-- Notification table
CREATE TABLE IF NOT EXISTS notification (
  id SERIAL PRIMARY KEY,
  destinataire_id INTEGER NOT NULL,
  destinataire_type VARCHAR(20) NOT NULL DEFAULT 'parent',
  type VARCHAR(50) NOT NULL,
  canal VARCHAR(20) NOT NULL DEFAULT 'in_app',
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  envoye BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_destinataire
  ON notification(destinataire_id, destinataire_type);

CREATE INDEX IF NOT EXISTS idx_notification_type
  ON notification(type);

CREATE INDEX IF NOT EXISTS idx_notification_lu
  ON notification(destinataire_id, lu);
`;

// ═══════════════════════════════════════════════════════════════════════════════
// 8.  day11-appjs-patch.js — Integration instructions
// ═══════════════════════════════════════════════════════════════════════════════
const appJsPatch = `
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
`;

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE ALL FILES
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n🚀 Generating Day 11 — Notification System files (corrected)…\n');

writeFile('src/models/Notification.js', notificationModel);
// NOTE: smsService.js is NOT overwritten — it already exists and works fine
writeFile('src/services/notificationService.js', notificationService);
writeFile('src/services/reminderService.js', reminderService);
writeFile('src/controllers/notificationController.js', notificationController);
writeFile('src/routes/notificationRoutes.js', notificationRoutes);
writeFile('src/validators/notificationValidator.js', notificationValidator);
writeFile('src/models/migrations/003_add_notification.sql', migrationSQL);
writeFile('day11-appjs-patch.js', appJsPatch);

console.log('\n✨ Day 11 generation complete! 8 files created.');
console.log('⚠️  smsService.js was NOT overwritten (already exists in project).\n');
