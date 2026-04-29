const { query } = require('../config/database');

const Croissance = {
  async create(data) {
    const { bebe_id, date_mesure, poids, taille, age_semaines } = data;
    const result = await query(
      `INSERT INTO croissance (bebe_id, date_mesure, poids, taille, age_semaines)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bebe_id, date_mesure, poids, taille, age_semaines],
    );
    return result.rows[0];
  },

  async findByBebe(bebeId) {
    const result = await query('SELECT * FROM croissance WHERE bebe_id = $1 ORDER BY date_mesure', [
      bebeId,
    ]);
    return result.rows;
  },

  async findByBebeRange(bebeId, startDate, endDate) {
    const result = await query(
      'SELECT * FROM croissance WHERE bebe_id = $1 AND date_mesure BETWEEN $2 AND $3 ORDER BY date_mesure',
      [bebeId, startDate, endDate],
    );
    return result.rows;
  },

  async getLatest(bebeId) {
    const result = await query(
      'SELECT * FROM croissance WHERE bebe_id = $1 ORDER BY date_mesure DESC LIMIT 1',
      [bebeId],
    );
    return result.rows[0];
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['poids', 'taille', 'age_semaines'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE croissance SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },
};

module.exports = Croissance;
