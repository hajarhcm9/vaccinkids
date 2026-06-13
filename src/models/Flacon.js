const { pool, query } = require('../config/database');
const ApiError = require('../utils/ApiError');

const Flacon = {
  async create(data) {
    const { vaccin_id, session_id, numero_lot, fabricant, user_id } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let stock = null;
      if (session_id) {
        const stockResult = await client.query(
          `SELECT st.*
           FROM stock st
           JOIN session s ON s.centre_id = st.centre_id
           WHERE s.id = $1 AND st.vaccin_id = $2
           FOR UPDATE OF st`,
          [session_id, vaccin_id],
        );
        stock = stockResult.rows[0];
        if (!stock || stock.quantite_disponible <= 0) {
          throw ApiError.conflict('No vial stock available for this session');
        }
      }

      const result = await client.query(
        'INSERT INTO flacon (vaccin_id, session_id, numero_lot, fabricant, date_ouverture) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
        [vaccin_id, session_id || null, numero_lot, fabricant],
      );

      if (stock) {
        const updated = await client.query(
          `UPDATE stock
           SET quantite_disponible = quantite_disponible - 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 RETURNING *`,
          [stock.id],
        );
        await client.query(
          `INSERT INTO stock_movement
           (stock_id, centre_id, vaccin_id, type, quantite_avant, quantite_apres,
            seuil_avant, seuil_apres, motif, user_id)
           VALUES ($1, $2, $3, 'VIAL_OPEN', $4, $5, $6, $7, $8, $9)`,
          [
            stock.id,
            stock.centre_id,
            stock.vaccin_id,
            stock.quantite_disponible,
            updated.rows[0].quantite_disponible,
            stock.seuil_alerte,
            updated.rows[0].seuil_alerte,
            `Flacon ${numero_lot} ouvert pour session ${session_id}`,
            user_id || null,
          ],
        );
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
