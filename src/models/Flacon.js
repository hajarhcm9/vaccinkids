const { query } = require('../config/database');

const Flacon = {
  async create(data) {
    const { vaccin_id, session_id, numero_lot, fabricant } = data;
    const result = await query(
      `INSERT INTO flacon (vaccin_id, session_id, numero_lot, fabricant)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vaccin_id, session_id, numero_lot, fabricant],
    );
    return result.rows[0];
  },

  async findBySession(sessionId) {
    const result = await query('SELECT * FROM flacon WHERE session_id = $1 ORDER BY created_at', [
      sessionId,
    ]);
    return result.rows;
  },

  async findByVaccin(vaccinId) {
    const result = await query(
      'SELECT * FROM flacon WHERE vaccin_id = $1 AND date_ouverture IS NOT NULL ORDER BY date_ouverture',
      [vaccinId],
    );
    return result.rows;
  },

  async openFlacon(id, force = false, justification = null) {
    let paramIndex = 1;
    const params = [];
    const setClauses = ['date_ouverture = CURRENT_TIMESTAMP'];
    if (force) {
      setClauses.push('ouverture_forcee = TRUE');
      if (justification) {
        paramIndex++;
        setClauses.push('justification_forcee = $' + paramIndex);
        params.push(justification);
      }
    }
    paramIndex++;
    const idParamIndex = paramIndex;
    params.push(id);
    const sql = 'UPDATE flacon SET ' + setClauses.join(', ') +
      ' WHERE id = $' + idParamIndex + ' RETURNING *';
    const result = await query(sql, params);
    return result.rows[0];
  },

  async incrementDoses(id, doses = 1) {
    const result = await query(
      `UPDATE flacon SET doses_utilisees = doses_utilisees + $2 WHERE id = $1 RETURNING *`,
      [id, doses],
    );
    return result.rows[0];
  },

  async incrementGaspi(id, doses = 1) {
    const result = await query(
      `UPDATE flacon SET doses_gaspillees = doses_gaspillees + $2 WHERE id = $1 RETURNING *`,
      [id, doses],
    );
    return result.rows[0];
  },

  async isEmpty(id) {
    const result = await query(
      `SELECT f.*, v.doses_par_flacon
       FROM flacon f
       JOIN vaccin v ON v.id = f.vaccin_id
       WHERE f.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;
    const flacon = result.rows[0];
    return flacon.doses_utilisees + flacon.doses_gaspillees >= flacon.doses_par_flacon;
  },
};

module.exports = Flacon;
