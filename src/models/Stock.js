const { query } = require('../config/database');

const Stock = {
  async createOrUpdate(centre_id, vaccin_id, data, userId) {
    const { quantite_disponible, seuil_alerte } = data;
    const before = await query('SELECT * FROM stock WHERE centre_id = $1 AND vaccin_id = $2', [
      centre_id,
      vaccin_id,
    ]);
    const previous = before.rows[0] || null;
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
    await this.recordMovement(result.rows[0], previous, 'UPSERT', data.motif, userId);
    return result.rows[0];
  },

  async findByCentre(centreId) {
    const result = await query(
      `SELECT s.*, v.nom AS vaccin_nom
       FROM stock s JOIN vaccin v ON v.id = s.vaccin_id
       WHERE s.centre_id = $1
       ORDER BY s.quantite_disponible ASC`,
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

  async update(id, data, userId) {
    const before = await query('SELECT * FROM stock WHERE id = $1', [id]);
    const previous = before.rows[0] || null;
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
    if (result.rows[0]) {
      const changedQuantity =
        previous && previous.quantite_disponible !== result.rows[0].quantite_disponible;
      await this.recordMovement(
        result.rows[0],
        previous,
        changedQuantity ? 'ADJUSTMENT' : 'THRESHOLD',
        data.motif,
        userId,
      );
    }
    return result.rows[0];
  },

  async recordMovement(current, previous, type, motif, userId) {
    await query(
      `INSERT INTO stock_movement
       (stock_id, centre_id, vaccin_id, type, quantite_avant, quantite_apres, seuil_avant, seuil_apres, motif, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        current.id,
        current.centre_id,
        current.vaccin_id,
        type,
        previous ? previous.quantite_disponible : null,
        current.quantite_disponible,
        previous ? previous.seuil_alerte : null,
        current.seuil_alerte,
        motif || null,
        userId || null,
      ],
    );
  },

  async findMovements(filters = {}) {
    const values = [];
    const conditions = [];
    if (filters.centreId) {
      values.push(filters.centreId);
      conditions.push(`sm.centre_id = $${values.length}`);
    }
    if (filters.stockId) {
      values.push(filters.stockId);
      conditions.push(`sm.stock_id = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT sm.*, v.nom AS vaccin_nom, c.nom AS centre_nom, p.nom AS user_nom, p.prenom AS user_prenom
       FROM stock_movement sm
       JOIN vaccin v ON v.id = sm.vaccin_id
       JOIN centre c ON c.id = sm.centre_id
       LEFT JOIN personnel p ON p.id = sm.user_id
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT 100`,
      values,
    );
    return result.rows;
  },
};

module.exports = Stock;
