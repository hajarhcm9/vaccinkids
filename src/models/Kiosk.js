const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/database');

const Kiosk = {
  async findActiveByCode(code) {
    const result = await query(
      `SELECT k.*, c.est_actif AS centre_actif
       FROM kiosk_identity k JOIN centre c ON c.id = k.centre_id
       WHERE k.code = $1 AND k.est_actif = TRUE`,
      [code],
    );
    return result.rows[0] || null;
  },

  async findActiveById(id) {
    const result = await query(
      `SELECT k.*, c.est_actif AS centre_actif
       FROM kiosk_identity k JOIN centre c ON c.id = k.centre_id
       WHERE k.id = $1 AND k.est_actif = TRUE`,
      [id],
    );
    return result.rows[0] || null;
  },

  async verifySecret(kiosk, secret) {
    return bcrypt.compare(secret, kiosk.secret_hash);
  },

  async list() {
    const result = await query(
      `SELECT k.id, k.code, k.centre_id, k.est_actif, k.rotated_at, k.created_at, c.nom AS centre_nom
       FROM kiosk_identity k JOIN centre c ON c.id = k.centre_id ORDER BY k.id`,
    );
    return result.rows;
  },

  async create({ code, centreId, secret }) {
    const secretHash = await bcrypt.hash(secret, 12);
    const result = await query(
      `INSERT INTO kiosk_identity (code, centre_id, secret_hash)
       VALUES ($1, $2, $3)
       RETURNING id, code, centre_id, est_actif, created_at`,
      [code, centreId, secretHash],
    );
    return result.rows[0];
  },

  async rotate(id) {
    const secret = crypto.randomBytes(24).toString('base64url');
    const secretHash = await bcrypt.hash(secret, 12);
    const result = await query(
      `UPDATE kiosk_identity
       SET secret_hash = $2, token_version = token_version + 1, rotated_at = NOW()
       WHERE id = $1
       RETURNING id, code, centre_id, est_actif, rotated_at`,
      [id, secretHash],
    );
    return result.rows[0] ? { ...result.rows[0], secret } : null;
  },

  async revoke(id) {
    const result = await query(
      `UPDATE kiosk_identity
       SET est_actif = FALSE, token_version = token_version + 1, rotated_at = NOW()
       WHERE id = $1
       RETURNING id, code, centre_id, est_actif, rotated_at`,
      [id],
    );
    return result.rows[0] || null;
  },
};

module.exports = Kiosk;
