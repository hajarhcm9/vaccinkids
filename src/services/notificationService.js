const Notification = require('../models/Notification');
const SmsService = require('./smsService');
const FirebaseService = require('./firebaseService');
const Parent = require('../models/Parent');
const { pool } = require('../config/database');
class NotificationService {
  async sendNotification(o) {
    const n = await Notification.create(o);
    let sent = false;
    try {
      if (o.canal === 'sms' && o.phone) {
        const r = await SmsService.sendSMS(o.phone, o.message);
        sent = r.success === true;
      } else if (o.canal === 'push' && o.destinataire_type === 'parent') {
        const token = await this._gft(o.destinataire_id);
        const r = await FirebaseService.sendPush(
          token,
          { title: o.titre, body: o.message },
          {
            type: o.type,
            reference_id: o.reference_id ? String(o.reference_id) : '',
            reference_type: o.reference_type || '',
          },
        );
        sent = r.success === true;
        if (r.permanent) await Parent.updateFcmToken(o.destinataire_id, null);
      } else if (o.canal === 'in_app') {
        sent = true;
      }
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', event: 'notification_dispatch_failed' }));
    }
    if (sent) {
      await Notification.markAsSent(n.id);
      n.envoye = true;
      n.date_envoi = new Date();
    }
    return n;
  }
  async _gp(id) {
    const { rows } = await pool.query('SELECT telephone FROM parent WHERE id = $1', [id]);
    return rows[0]?.telephone || null;
  }
  async _gft(id) {
    const { rows } = await pool.query('SELECT fcm_token FROM parent WHERE id = $1', [id]);
    return rows[0]?.fcm_token || null;
  }
  async _gs(id) {
    const { rows } = await pool.query(
      'SELECT date_session, heure_debut FROM session WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }
  _ds(si) {
    if (!si?.date_session) return 'votre prochaine session';

    const rawDate = si.date_session;
    const dateParts =
      rawDate instanceof Date && !Number.isNaN(rawDate.getTime())
        ? [rawDate.getFullYear(), rawDate.getMonth() + 1, rawDate.getDate()]
        : String(rawDate).slice(0, 10).split('-').map(Number);
    const timeParts = String(si.heure_debut || '00:00')
      .slice(0, 8)
      .split(':')
      .map(Number);
    const [year, month, day] = dateParts;
    const [hour = 0, minute = 0, second = 0] = timeParts;
    const sessionDate = new Date(year, month - 1, day, hour, minute, second);

    if (Number.isNaN(sessionDate.getTime())) return 'votre prochaine session';
    return sessionDate.toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
  }
  async sendRappelRdv(rv) {
    const phone = await this._gp(rv.parent_id);
    const ds = this._ds(await this._gs(rv.session_id));
    return this.sendNotification({
      destinataire_id: rv.parent_id,
      destinataire_type: 'parent',
      type: 'RAPPEL_RDV',
      canal: 'sms',
      titre: 'Rappel de rendez-vous',
      message: 'Rappel: vous avez un RDV le ' + ds + '.',
      reference_id: rv.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }
  async sendAbsenceNotification(rv) {
    const phone = await this._gp(rv.parent_id);
    const ds = this._ds(await this._gs(rv.session_id));
    return this.sendNotification({
      destinataire_id: rv.parent_id,
      destinataire_type: 'parent',
      type: 'ABSENCE',
      canal: 'sms',
      titre: 'Absence au rendez-vous',
      message: 'Votre RDV du ' + ds + ' a ete marque absent.',
      reference_id: rv.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }
  async sendConfirmationRdv(rv) {
    const phone = await this._gp(rv.parent_id);
    const ds = this._ds(await this._gs(rv.session_id));
    return this.sendNotification({
      destinataire_id: rv.parent_id,
      destinataire_type: 'parent',
      type: 'CONFIRMATION',
      canal: 'sms',
      titre: 'Confirmation de rendez-vous',
      message: 'Votre RDV est confirme pour le ' + ds + '.',
      reference_id: rv.id,
      reference_type: 'rendez_vous',
      phone,
    });
  }
  async sendAlerteStock(cId, vNom, qte) {
    const { rows: nurses } = await pool.query(
      "SELECT id FROM personnel WHERE centre_id = $1 AND role = 'infirmier'",
      [cId],
    );
    const notifs = [];
    for (const n of nurses) {
      notifs.push(
        await this.sendNotification({
          destinataire_id: n.id,
          destinataire_type: 'personnel',
          type: 'ALERTE_STOCK',
          canal: 'in_app',
          titre: 'Alerte stock vaccin',
          message: 'Stock bas: ' + vNom + ' - il reste ' + qte + ' dose(s).',
          reference_type: 'stock',
        }),
      );
    }
    return notifs;
  }
  async sendRappelSession(sId) {
    const { rows } = await pool.query('SELECT * FROM session WHERE id = $1', [sId]);
    const sess = rows[0];
    if (!sess) return null;
    const ds = this._ds(sess);
    const { rows: nurses } = await pool.query(
      "SELECT id FROM personnel WHERE centre_id = $1 AND role = 'infirmier'",
      [sess.centre_id],
    );
    const notifs = [];
    for (const n of nurses) {
      notifs.push(
        await this.sendNotification({
          destinataire_id: n.id,
          destinataire_type: 'personnel',
          type: 'INFO',
          canal: 'in_app',
          titre: 'Rappel session de vaccination',
          message: 'Rappel: session prevue le ' + ds + '.',
          reference_id: sId,
          reference_type: 'session',
        }),
      );
    }
    return notifs;
  }
}
module.exports = new NotificationService();
