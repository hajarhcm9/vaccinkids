const { query } = require('../config/database');

const Flacon = {
  async create(data) {
    const { vaccin_id, session_id, numero_lot, fabricant } = data;
    const result = await query(
      'INSERT INTO flacon (vaccin_id, session_id, numero_lot, fabricant, date_ouverture) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
      [vaccin_id, session_id || null, numero_lot, fabricant],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM flacon WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findBySession(sessionId) {
    const result = await query(
      `SELECT f.*, v.doses_par_flacon,
              GREATEST(v.doses_par_flacon - f.doses_utilisees - f.doses_gaspillees, 0)::int
                AS doses_restantes
       FROM flacon f JOIN vaccin v ON v.id = f.vaccin_id
       WHERE f.session_id = $1
       ORDER BY f.date_ouverture`,
      [sessionId],
    );
    return result.rows;
  },

  async findByVaccin(vaccinId) {
    const result = await query(
      'SELECT * FROM flacon WHERE vaccin_id = $1 AND date_ouverture IS NOT NULL ORDER BY date_ouverture',
      [vaccinId],
    );
    return result.rows;
  },

  async findActiveBySession(sessionId) {
    const result = await query(
      'SELECT * FROM flacon WHERE session_id = $1 AND date_fermeture IS NULL AND doses_utilisees + doses_gaspillees < (SELECT doses_par_flacon FROM vaccin WHERE vaccin.id = flacon.vaccin_id) ORDER BY date_ouverture LIMIT 1',
      [sessionId],
    );
    return result.rows[0];
  },

  async incrementDose(id) {
    const result = await query(
      'UPDATE flacon SET doses_utilisees = doses_utilisees + 1 WHERE id = $1 RETURNING *',
      [id],
    );
    return result.rows[0];
  },

  async incrementDoses(id, doses = 1) {
    const result = await query(
      'UPDATE flacon SET doses_utilisees = doses_utilisees + $2 WHERE id = $1 RETURNING *',
      [id, doses],
    );
    return result.rows[0];
  },

  async addWaste(id) {
    const result = await query(
      'UPDATE flacon SET doses_gaspillees = doses_gaspillees + 1 WHERE id = $1 RETURNING *',
      [id],
    );
    return result.rows[0];
  },

  async incrementGaspi(id, doses = 1) {
    const result = await query(
      'UPDATE flacon SET doses_gaspillees = doses_gaspillees + $2 WHERE id = $1 RETURNING *',
      [id, doses],
    );
    return result.rows[0];
  },

  async forceClose(id, justification) {
    const result = await query(
      `UPDATE flacon
       SET ouverture_forcee = TRUE, justification_forcee = $2,
           justification_fermeture = $2, date_fermeture = NOW(), updated_at = NOW()
       WHERE id = $1 AND date_fermeture IS NULL RETURNING *`,
      [id, justification],
    );
    return result.rows[0];
  },

  async close(id) {
    const result = await query(
      `UPDATE flacon f
       SET date_fermeture = NOW(), updated_at = NOW()
       FROM vaccin v
       WHERE f.id = $1 AND v.id = f.vaccin_id AND f.date_fermeture IS NULL
         AND f.doses_utilisees + f.doses_gaspillees >= v.doses_par_flacon
       RETURNING f.*`,
      [id],
    );
    return result.rows[0];
  },

  async openFlacon(id, force = false, justification = null) {
    if (force) return this.forceClose(id, justification);
    const result = await query(
      'UPDATE flacon SET date_ouverture = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );
    return result.rows[0];
  },

  async isEmpty(id) {
    const result = await query(
      'SELECT f.*, v.doses_par_flacon FROM flacon f JOIN vaccin v ON v.id = f.vaccin_id WHERE f.id = $1',
      [id],
    );
    if (!result.rows[0]) return null;
    const flacon = result.rows[0];
    return flacon.doses_utilisees + flacon.doses_gaspillees >= flacon.doses_par_flacon;
  },
};

module.exports = Flacon;
