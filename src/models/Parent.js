const { query } = require('../config/database');

const Parent = {
  async create(data) {
    const { telephone, nom, prenom, langue_preferee } = data;
    const result = await query(
      `INSERT INTO parent (telephone, nom, prenom, langue_preferee)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [telephone, nom, prenom, langue_preferee || 'fr'],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      'SELECT id, telephone, nom, prenom, langue_preferee, nb_absences_consecutives, est_actif, created_at FROM parent WHERE id = $1',
      [id],
    );
    return result.rows[0];
  },

  async findByPhone(telephone) {
    const result = await query('SELECT * FROM parent WHERE telephone = $1', [telephone]);
    return result.rows[0];
  },

  async updateFcmToken(id, fcmToken) {
    const result = await query(
      'UPDATE parent SET fcm_token = $1, updated_at = NOW() WHERE id = $2 RETURNING id, fcm_token',
      [fcmToken, id],
    );
    return result.rows[0];
  },

  async getFcmToken(id) {
    const result = await query('SELECT fcm_token FROM parent WHERE id = $1', [id]);
    return result.rows[0]?.fcm_token || null;
  },

  async incrementAbsences(id) {
    const result = await query(
      `UPDATE parent SET nb_absences_consecutives = nb_absences_consecutives + 1
       WHERE id = $1 RETURNING nb_absences_consecutives`,
      [id],
    );
    return result.rows[0].nb_absences_consecutives;
  },

  async resetAbsences(id) {
    await query('UPDATE parent SET nb_absences_consecutives = 0 WHERE id = $1', [id]);
  },

  async findChronicAbsentees(centreId) {
    const result = await query(
      `SELECT p.id, p.telephone, p.nom, p.prenom, p.nb_absences_consecutives
       FROM parent p
       JOIN bebe b ON b.parent_id = p.id
       JOIN rendez_vous rdv ON rdv.bebe_id = b.id
       JOIN session s ON s.id = rdv.session_id
       WHERE p.nb_absences_consecutives >= 2 AND s.centre_id = $1
       GROUP BY p.id ORDER BY p.nb_absences_consecutives DESC`,
      [centreId],
    );
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['nom', 'prenom', 'langue_preferee', 'est_actif'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE parent SET ${fields.join(', ')} WHERE id = $1 RETURNING id, telephone, nom, prenom, langue_preferee, est_actif`,
      values,
    );
    return result.rows[0];
  },
};

module.exports = Parent;
