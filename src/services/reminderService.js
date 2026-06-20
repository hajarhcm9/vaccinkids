const { pool } = require('../config/database');
const ns = require('./notificationService');

class ReminderService {
  constructor() {
    this.timers = [];
    this.running = false;
  }
  start() {
    if (this.running) return;
    this.running = true;
    console.log('[ReminderService] Starting...');
    this.timers.push(
      setInterval(() => {
        this.checkUpcomingAppointments().catch((e) => console.error('[ReminderService] apt:', e.message));
      }, 3600000),
    );
    this.timers.push(
      setInterval(() => {
        this.checkTodaySessions().catch((e) => console.error('[ReminderService] sess:', e.message));
      }, 3600000),
    );
    this.timers.push(
      setInterval(() => {
        this.checkLowStock().catch((e) => console.error('[ReminderService] stock:', e.message));
      }, 3600000),
    );
    this.checkUpcomingAppointments().catch(() => {});
    this.checkTodaySessions().catch(() => {});
    this.checkLowStock().catch(() => {});
  }
  stop() {
    if (!this.running) return;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.running = false;
    console.log('[ReminderService] Stopped');
  }
  async checkUpcomingAppointments() {
    const { rows } = await pool.query(
      `SELECT rv.*, p.telephone AS parent_telephone, s.date_session, s.heure_debut
       FROM rendez_vous rv
       JOIN parent p ON p.id = rv.parent_id
       JOIN session s ON s.id = rv.session_id
       WHERE rv.statut = 'EN_ATTENTE'
         AND s.date_session BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
         AND NOT EXISTS (
           SELECT 1 FROM notification n
           WHERE n.reference_id = rv.id
             AND n.reference_type = 'rendez_vous'
             AND n.type = 'RAPPEL'
             AND n.created_at >= NOW() - INTERVAL '20 hours'
         )`,
    );
    if (!rows.length) return [];
    const n = [];
    for (const rv of rows) {
      try {
        n.push(await ns.sendRappelRdv(rv));
      } catch (e) {
        console.error('[ReminderService] RDV#' + rv.id + ':', e.message);
      }
    }
    return n;
  }
  async checkTodaySessions() {
    const { rows } = await pool.query('SELECT * FROM session WHERE date_session = CURRENT_DATE');
    if (!rows.length) return [];
    const n = [];
    for (const s of rows) {
      try {
        const r = await ns.sendRappelSession(s.id);
        if (r) n.push(...r);
      } catch (e) {
        console.error('[RS] S#' + s.id + ':', e.message);
      }
    }
    return n;
  }
  async checkLowStock() {
    const { rows } = await pool.query(
      'SELECT s.*, v.nom AS vaccin_nom, s.quantite_disponible, s.seuil_alerte, s.centre_id FROM stock s JOIN vaccin v ON v.id = s.vaccin_id WHERE s.quantite_disponible <= s.seuil_alerte',
    );
    if (!rows.length) return [];
    const n = [];
    for (const i of rows) {
      try {
        const r = await ns.sendAlerteStock(i.centre_id, i.vaccin_nom, i.quantite_disponible);
        n.push(...r);
      } catch (e) {
        console.error('[ReminderService] stock:', e.message);
      }
    }
    return n;
  }
}
module.exports = new ReminderService();
