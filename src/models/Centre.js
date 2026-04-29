const { query } = require('../config/database');

const Centre = {
  async create(data) {
    const { nom, adresse, telephone, gps_lat, gps_lng } = data;
    const result = await query(
      `INSERT INTO centre (nom, adresse, telephone, gps_lat, gps_lng)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nom, adresse, telephone, gps_lat, gps_lng],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM centre WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findAll(activeOnly = true) {
    const sql = activeOnly
      ? 'SELECT * FROM centre WHERE est_actif = TRUE ORDER BY nom'
      : 'SELECT * FROM centre ORDER BY nom';
    const result = await query(sql);
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['nom', 'adresse', 'telephone', 'gps_lat', 'gps_lng', 'est_actif'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE centre SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  async deactivate(id) {
    const result = await query('UPDATE centre SET est_actif = FALSE WHERE id = $1 RETURNING *', [
      id,
    ]);
    return result.rows[0];
  },
};

module.exports = Centre;
