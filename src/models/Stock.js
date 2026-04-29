const { query } = require('../config/database');

const Stock = {
  async createOrUpdate(centre_id, vaccin_id, data) {
    const { quantite_disponible, seuil_alerte } = data;
    const result = await query(
      `INSERT INTO stock (centre_id, vaccin_id, quantite_disponible, seuil_alerte)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (centre_id, vaccin_id) DO UPDATE SET
       quantite_disponible = EXCLUDED.quantite_disponible,
       seuil_alerte = EXCLUDED.seuil_alerte,
       updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [centre_id, vaccin_id, quantite_disponible, seuil_alerte || 5],
    );
    return result.rows[0];
  },

  async findByCentre(centreId) {
    const result = await query(
      'SELECT * FROM stock WHERE centre_id = $1 ORDER BY quantite_disponible ASC',
      [centreId],
    );
    return result.rows;
  },

  async findLowStock(centreId) {
    const result = await query(
      `SELECT s.*, v.nom 
       FROM stock s JOIN vaccin v ON v.id = s.vaccin_id
       WHERE s.centre_id = $1 AND s.quantite_disponible <= s.seuil_alerte`,
      [centreId],
    );
    return result.rows;
  },

  async findByVaccin(vaccinId) {
    const result = await query('SELECT * FROM stock WHERE vaccin_id = $1', [vaccinId]);
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['quantite_disponible', 'seuil_alerte'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE stock SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },
};

module.exports = Stock;
