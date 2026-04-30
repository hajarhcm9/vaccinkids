const { pool } = require('../config/database');

class Notification {
  /**
   * Create the notification table if it does not exist yet.
   */
  static async initTable() {
    await pool.query(`
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
    `);
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
    const sql = `
      INSERT INTO notification
        (destinataire_id, destinataire_type, type, canal, titre, message, reference_id, reference_type, date_envoi)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
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

    const countSql = `SELECT COUNT(*)::int AS total FROM notification ${whereClause}`;
    const dataSql = `
      SELECT * FROM notification ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

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
      `UPDATE notification SET lu = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  }

  static async markAllAsRead(destinataire_id, destinataire_type = 'parent') {
    const { rowCount } = await pool.query(
      `UPDATE notification SET lu = TRUE, updated_at = NOW()
       WHERE destinataire_id = $1 AND destinataire_type = $2 AND lu = FALSE`,
      [destinataire_id, destinataire_type]
    );
    return rowCount;
  }

  static async countUnread(destinataire_id, destinataire_type = 'parent') {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM notification
       WHERE destinataire_id = $1 AND destinataire_type = $2 AND lu = FALSE`,
      [destinataire_id, destinataire_type]
    );
    return rows[0].count;
  }

  static async deleteOld(daysOld) {
    const { rowCount } = await pool.query(
      `DELETE FROM notification WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [daysOld]
    );
    return rowCount;
  }

  static async markAsSent(id) {
    const { rows } = await pool.query(
      `UPDATE notification SET envoye = TRUE, date_envoi = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = Notification;
