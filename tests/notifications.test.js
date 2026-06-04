const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/database');
const Notification = require('../src/models/Notification');

// ─── Helpers ────────────────────────────────────────────────────────────────
let parentToken;
let nurseToken;
let adminToken;
let parentId;
let nurseId;
let testNotificationId;

// ─── Setup ──────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // Ensure the notification table exists
  await Notification.initTable();

  // Create a test parent and get token
  const parentPhone = '+212600000099';
  const otpResponse = await request(app)
    .post('/api/auth/parent/send-otp')
    .send({ telephone: parentPhone });
  const otp = otpResponse.body.data.devOtp;

  const verifyRes = await request(app)
    .post('/api/auth/parent/verify-otp')
    .send({ telephone: parentPhone, code: otp });

  parentToken = verifyRes.body.data?.tokens?.accessToken || verifyRes.body.data?.token;
  parentId = verifyRes.body.data?.user?.id || verifyRes.body.data?.parent?.id;

  // Login as nurse — adjust CIN/password to match your seed data
  const nurseLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'INFIRM01', mot_de_passe: 'infirmier123' });

  nurseToken = nurseLogin.body.data?.tokens?.accessToken || nurseLogin.body.data?.token;
  nurseId = nurseLogin.body.data?.user?.id;

  // Login as admin
  const adminLogin = await request(app)
    .post('/api/auth/personnel/login')
    .send({ cin: 'ADMIN01', mot_de_passe: 'admin123' });

  adminToken = adminLogin.body.data?.tokens?.accessToken || adminLogin.body.data?.token;
});

afterAll(async () => {
  await pool.end();
});

// ─── Test Suite ─────────────────────────────────────────────────────────────
describe('Notification System (Day 11)', () => {

  // ─── 1. Send a manual notification ─────────────────────────────────────
  describe('POST /api/notifications/send', () => {
    it('should allow admin to send a notification', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          destinataire_id: parentId,
          destinataire_type: 'parent',
          type: 'INFO',
          canal: 'in_app',
          titre: 'Test notification',
          message: 'Ceci est une notification de test.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.titre).toBe('Test notification');
      expect(res.body.data.type).toBe('INFO');
      expect(res.body.data.destinataire_id).toBe(parentId);
      testNotificationId = res.body.data.id;
    });

    it('should allow nurse to send a notification', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer ' + nurseToken)
        .send({
          destinataire_id: parentId,
          destinataire_type: 'parent',
          type: 'RAPPEL_RDV',
          canal: 'sms',
          titre: 'Rappel RDV',
          message: 'Rappel: votre rendez-vous est demain.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('RAPPEL_RDV');
      expect(res.body.data.canal).toBe('sms');
    });

    it('should dispatch push notification when parent has an FCM token', async () => {
      await pool.query('UPDATE parent SET fcm_token = $1 WHERE id = $2', [
        'test-fcm-token-1234567890',
        parentId,
      ]);

      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          destinataire_id: parentId,
          destinataire_type: 'parent',
          type: 'INFO',
          canal: 'push',
          titre: 'Push test',
          message: 'Notification push de test.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('INFO');
      expect(res.body.data.canal).toBe('push');
      expect(res.body.data.envoye).toBe(true);
    });

    it('should deny parent from sending manual notifications', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer ' + parentToken)
        .send({
          destinataire_id: parentId,
          type: 'INFO',
          canal: 'in_app',
          titre: 'Should fail',
          message: 'Parents cannot send notifications.',
        });

      expect(res.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/notifications/send')
        .set('Authorization', 'Bearer ' + adminToken)
        .send({
          // Missing destinataire_id, type, titre, message
          canal: 'in_app',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── 2. Get my notifications ───────────────────────────────────────────
  describe('GET /api/notifications/me', () => {
    it('should return parent notifications', async () => {
      const res = await request(app)
        .get('/api/notifications/me')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('should support unread-only filter', async () => {
      const res = await request(app)
        .get('/api/notifications/me?non_seulement=true')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // All returned notifications should be unread
      res.body.data.forEach((n) => {
        expect(n.lu).toBe(false);
      });
    });

    it('should deny unauthenticated access', async () => {
      const res = await request(app)
        .get('/api/notifications/me');

      expect(res.status).toBe(401);
    });
  });

  // ─── 3. Unread count ──────────────────────────────────────────────────
  describe('GET /api/notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeDefined();
      expect(typeof res.body.data.count).toBe('number');
      expect(res.body.data.count).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── 4. Mark as read ──────────────────────────────────────────────────
  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Make sure we have a notification to mark
      if (!testNotificationId) {
        const sendRes = await request(app)
          .post('/api/notifications/send')
          .set('Authorization', 'Bearer ' + adminToken)
          .send({
            destinataire_id: parentId,
            destinataire_type: 'parent',
            type: 'CONFIRMATION',
            canal: 'in_app',
            titre: 'To mark read',
            message: 'Mark this as read.',
          });
        testNotificationId = sendRes.body.data.id;
      }

      const res = await request(app)
        .patch('/api/notifications/' + testNotificationId + '/read')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(res.body.data.lu).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/999999/read')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(404);
    });
  });

  // ─── 5. Mark all as read ──────────────────────────────────────────────
  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', 'Bearer ' + parentToken);

      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBeDefined();
      expect(typeof res.body.data.updated).toBe('number');
    });
  });

  // ─── 6. Notification model direct tests ───────────────────────────────
  describe('Notification Model', () => {
    it('should create and retrieve a notification', async () => {
      const notif = await Notification.create({
        destinataire_id: parentId,
        destinataire_type: 'parent',
        type: 'ALERTE_STOCK',
        canal: 'in_app',
        titre: 'Stock bas',
        message: 'Le stock de BCG est bas.',
        reference_type: 'stock',
      });

      expect(notif).toBeDefined();
      expect(notif.id).toBeDefined();
      expect(notif.type).toBe('ALERTE_STOCK');
      expect(notif.lu).toBe(false);

      const found = await Notification.findById(notif.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(notif.id);
    });

    it('should count unread notifications', async () => {
      const count = await Notification.countUnread(parentId, 'parent');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should delete old notifications', async () => {
      const deleted = await Notification.deleteOld(0);
      expect(typeof deleted).toBe('number');
    });
  });

  // ─── 7. SMS Service ───────────────────────────────────────────────────
  describe('SMS Service', () => {
    it('should send mock SMS in non-production', async () => {
      const SmsService = require('../src/services/smsService');
      const result = await SmsService.sendSMS('+212600000099', 'Test message');
      expect(result.success).toBe(true);
    });
  });

  // ─── 8. Reminder Service ──────────────────────────────────────────────
  describe('Reminder Service', () => {
    it('should expose check methods without throwing', async () => {
      const reminderService = require('../src/services/reminderService');
      const appointments = await reminderService.checkUpcomingAppointments();
      expect(Array.isArray(appointments)).toBe(true);

      const sessions = await reminderService.checkTodaySessions();
      expect(Array.isArray(sessions)).toBe(true);

      const stock = await reminderService.checkLowStock();
      expect(Array.isArray(stock)).toBe(true);
    });
  });
});
