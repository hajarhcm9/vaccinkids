const fs = require('fs');

// Fix 1: notificationService.js
fs.writeFileSync('src/services/notificationService.js', `
const Notification = require('../models/Notification');
const SmsService = require('./smsService');
const { pool } = require('../config/database');

class NotificationService {
  async sendNotification({ destinataire_id, type, canal = 'in_app', titre, message, 
reference_id = null, reference_type = null, destinataire_type = 'parent', phone = null 
}) {
    const notification = await Notification.create({ destinataire_id, 
destinataire_type, type, canal, titre, message, reference_id, reference_type });
    let sent = false;
    try {
      if (canal === 'sms' && phone) { const result = await SmsService.sendSMS(phone, 
message); sent = result.success === true; }
      else if (canal === 'in_app') { sent = true; }
    } catch (err) { console.error('[NotificationService] Dispatch error:', 
err.message); }
    if (sent) { await Notification.markAsSent(notification.id); notification.envoye = 
true; notification.date_envoi = new Date(); }
    return notification;
  }
  async _getParentPhone(parentId) { const { rows } = await pool.query('SELECT 
telephone FROM parent WHERE id = $1', [parentId]); return rows[0]?.telephone || null; 
}
  async _getSessionDate(sessionId) { const { rows } = await pool.query('SELECT 
date_session, heure_debut FROM session WHERE id = $1', [sessionId]); return rows[0] || 
null; }
  async sendRappelRdv(rv) {
    const phone = await this._getParentPhone(rv.parent_id);
    const si = await this._getSessionDate(rv.session_id);
    const ds = si ? new Date(si.date_session + 'T' + 
si.heure_debut).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 
'votre prochaine session';
    return this.sendNotification({ destinataire_id: rv.parent_id, destinataire_type: 
'parent', type: 'RAPPEL_RDV', canal: 'sms', titre: 'Rappel de rendez-vous', message: 
'Rappel: vous avez un rendez-vous de vaccination le ' + ds + '.', reference_id: rv.id, 
reference_type: 'rendez_vous', phone });
  }
  async sendAbsenceNotification(rv) {
    const phone = await this._getParentPhone(rv.parent_id);
    const si = await this._getSessionDate(rv.session_id);
    const ds = si ? new Date(si.date_session + 'T' + 
si.heure_debut).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 
'votre prochaine session';
    return this.sendNotification({ destinataire_id: rv.parent_id, destinataire_type: 
'parent', type: 'ABSENCE', canal: 'sms', titre: 'Absence au rendez-vous', message: 
'Votre rendez-vous du ' + ds + ' a ete marque comme absent.', reference_id: rv.id, 
reference_type: 'rendez_vous', phone });
  }
  async sendConfirmationRdv(rv) {
    const phone = await this._getParentPhone(rv.parent_id);
    const si = await this._getSessionDate(rv.session_id);
    const ds = si ? new Date(si.date_session + 'T' + 
si.heure_debut).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 
'votre prochaine session';
    return this.sendNotification({ destinataire_id: rv.parent_id, destinataire_type: 
'parent', type: 'CONFIRMATION', canal: 'sms', titre: 'Confirmation de rendez-vous', 
message: 'Votre rendez-vous de vaccination est confirme pour le ' + ds + '.', 
reference_id: rv.id, reference_type: 'rendez_vous', phone });
  }
  async sendAlerteStock(centreId, vaccinNom, quantiteRestante) {
    const { rows: nurses } = await pool.query("SELECT id, telephone FROM personnel 
WHERE centre_id = $1 AND role = 'infirmier'", [centreId]);
    const notifications = [];
    for (const nurse of nurses) {
      const notification = await this.sendNotification({ destinataire_id: nurse.id, 
destinataire_type: 'personnel', type: 'ALERTE_STOCK', canal: 'in_app', titre: 'Alerte 
stock vaccin', message: 'Stock bas: ' + vaccinNom + ' - il reste ' + quantiteRestante 
+ ' dose(s) dans votre centre.', reference_type: 'stock', phone: nurse.telephone });
      notifications.push(notification);
    }
    return notifications;
  }
  async sendRappelSession(sessionId) {
    const { rows } = await pool.query('SELECT * FROM session WHERE id = $1', 
[sessionId]);
    const session = rows[0];
    if (!session) return null;
    const ds = new Date(session.date_session + 'T' + 
session.heure_debut).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' 
});
    const { rows: nurses } = await pool.query("SELECT id, telephone FROM personnel 
WHERE centre_id = $1 AND role = 'infirmier'", [session.centre_id]);
    const notifications = [];
    for (const nurse of nurses) {
      const notification = await this.sendNotification({ destinataire_id: nurse.id, 
destinataire_type: 'personnel', type: 'INFO', canal: 'in_app', titre: 'Rappel session 
de vaccination', message: 'Rappel: session de vaccination prevue le ' + ds + '.', 
reference_id: sessionId, reference_type: 'session', phone: nurse.telephone });
      notifications.push(notification);
    }
    return notifications;
  }
}
module.exports = new NotificationService();
`.trim() + '\n');
console.log('Fixed: notificationService.js');

// Fix 2: reminderService.js
fs.writeFileSync('src/services/reminderService.js', `
const { pool } = require('../config/database');
const notificationService = require('./notificationService');
class ReminderService {
  constructor() {
    this.timers = [];
    this.running = false;
    this.intervals = {
      appointments: process.env.REMINDER_APPOINTMENTS_INTERVAL ? 
parseInt(process.env.REMINDER_APPOINTMENTS_INTERVAL, 10) : 3600000,
      sessions: process.env.REMINDER_SESSIONS_INTERVAL ? 
parseInt(process.env.REMINDER_SESSIONS_INTERVAL, 10) : 3600000,
      stock: process.env.REMINDER_STOCK_INTERVAL ? 
parseInt(process.env.REMINDER_STOCK_INTERVAL, 10) : 3600000,
    };
  }
  start() {
    if (this.running) { console.warn('[ReminderService] Already running'); return; }
    this.running = true;
    console.log('[ReminderService] Starting scheduled jobs...');
    this.timers.push(setInterval(() => { this.checkUpcomingAppointments().catch(e => 
console.error('[ReminderService] appointments error:', e.message)); }, 
this.intervals.appointments));
    this.timers.push(setInterval(() => { this.checkTodaySessions().catch(e => 
console.error('[ReminderService] sessions error:', e.message)); }, 
this.intervals.sessions));
    this.timers.push(setInterval(() => { this.checkLowStock().catch(e => 
console.error('[ReminderService] stock error:', e.message)); }, 
this.intervals.stock));
    this.checkUpcomingAppointments().catch(() => {});
    this.checkTodaySessions().catch(() => {});
    this.checkLowStock().catch(() => {});
  }
  stop() {
    if (!this.running) return;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.running = false;
    console.log('[ReminderService] Stopped all scheduled jobs');
  }
  async checkUpcomingAppointments() {
    const { rows } = await pool.query("SELECT rv.*, p.telephone AS parent_telephone, 
s.date_session, s.heure_debut FROM rendez_vous rv JOIN parent p ON p.id = rv.parent_id 
JOIN session s ON s.id = rv.session_id WHERE rv.statut = 'EN_ATTENTE' AND 
s.date_session BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'");
    if (rows.length === 0) return [];
    console.log('[ReminderService] Found ' + rows.length + ' upcoming 
appointment(s)');
    const notifications = [];
    for (const rv of rows) { try { notifications.push(await 
notificationService.sendRappelRdv(rv)); } catch (err) { 
console.error('[ReminderService] Failed for RDV #' + rv.id + ':', err.message); } }
    return notifications;
  }
  async checkTodaySessions() {
    const { rows } = await pool.query("SELECT * FROM session WHERE date_session = 
CURRENT_DATE");
    if (rows.length === 0) return [];
    console.log('[ReminderService] Found ' + rows.length + ' session(s) today');
    const notifications = [];
    for (const s of rows) { try { const n = await 
notificationService.sendRappelSession(s.id); if (n) notifications.push(...n); } catch 
(err) { console.error('[ReminderService] Failed for session #' + s.id + ':', 
err.message); } }
    return notifications;
  }
  async checkLowStock() {
    const { rows } = await pool.query("SELECT s.*, v.nom AS vaccin_nom, s.quantite, 
s.seuil_alerte, s.centre_id FROM stock s JOIN vaccin v ON v.id = s.vaccin_id WHERE 
s.quantite <= s.seuil_alerte");
    if (rows.length === 0) return [];
    console.log('[ReminderService] Found ' + rows.length + ' low-stock item(s)');
    const notifications = [];
    for (const item of rows) { try { const n = await 
notificationService.sendAlerteStock(item.centre_id, item.vaccin_nom, item.quantite); 
notifications.push(...n); } catch (err) { console.error('[ReminderService] Stock alert 
error:', err.message); } }
    return notifications;
  }
}
module.exports = new ReminderService();
`.trim() + '\n');
console.log('Fixed: reminderService.js');

// Fix 3: tests/notifications.test.js - fix passwords and token extraction
let t = fs.readFileSync('tests/notifications.test.js', 'utf8');
t = t.replace(/mot_de_passe: 'password123'/g, "mot_de_passe: 'admin123'");
t = t.replace("cin: 'INFIRM01', mot_de_passe: 'admin123'", "cin: 'INFIRM01', 
mot_de_passe: 'infirmier123'");
t = t.replace(/nurseToken = nurseLogin\.body\.data\?\.token \|\| 
nurseLogin\.body\.token;/g, "nurseToken = nurseLogin.body.data?.tokens?.accessToken || 
nurseLogin.body.data?.token;");
t = t.replace(/adminToken = adminLogin\.body\.data\?\.token \|\| 
adminLogin\.body\.token;/g, "adminToken = adminLogin.body.data?.tokens?.accessToken || 
adminLogin.body.data?.token;");
t = t.replace(/parentToken = verifyRes\.body\.data\?\.token \|\| 
verifyRes\.body\.token;/g, "parentToken = verifyRes.body.data?.tokens?.accessToken || 
verifyRes.body.data?.token;");
t = t.replace(/parentId = verifyRes\.body\.data\?\.user\?\.id \|\| 
verifyRes\.body\.user\?\.id;/g, "parentId = verifyRes.body.data?.user?.id || 
verifyRes.body.data?.parent?.id;");
t = t.replace(/nurseId = nurseLogin\.body\.data\?\.user\?\.id \|\| 
nurseLogin\.body\.user\?\.id;/g, "nurseId = nurseLogin.body.data?.user?.id;");
fs.writeFileSync('tests/notifications.test.js', t);
console.log('Fixed: tests/notifications.test.js');

console.log('All Day 11 fixes applied!');
