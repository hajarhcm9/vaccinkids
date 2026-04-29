const { query } = require('../config/database');

const Vaccin = {
  async create(data) {
    const { nom, doses_par_flacon, age_cible_semaines, maladies_ciblees } = data;
    const result = await query(
      `INSERT INTO vaccin (nom, doses_par_flacon, age_cible_semaines, maladies_ciblees)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nom, doses_par_flacon, age_cible_semaines, maladies_ciblees],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM vaccin WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findAll(activeOnly = true) {
    const sql = activeOnly
      ? 'SELECT * FROM vaccin WHERE est_actif = TRUE ORDER BY age_cible_semaines'
      : 'SELECT * FROM vaccin ORDER BY age_cible_semaines';
    const result = await query(sql);
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = [
      'nom',
      'doses_par_flacon',
      'age_cible_semaines',
      'maladies_ciblees',
      'est_actif',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE vaccin SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  async deactivate(id) {
    const result = await query('UPDATE vaccin SET est_actif = FALSE WHERE id = $1 RETURNING *', [
      id,
    ]);
    return result.rows[0];
  },
};

module.exports = Vaccin;
