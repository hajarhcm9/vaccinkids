const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

const RendezVous = {
  async create(data) {
    const { session_id, parent_id, bebe_id } = data;
    try {
      const result = await query(
        `INSERT INTO rendez_vous (session_id, parent_id, bebe_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [session_id, parent_id, bebe_id],
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw ApiError.conflict('Ce bébé est déjà inscrit à cette session');
      }
      throw error;
    }
  },

  async findById(id) {
    const result = await query('SELECT * FROM rendez_vous WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT * FROM rendez_vous WHERE session_id = $1 ORDER BY date_creation',
      [sessionId],
    );
    return result.rows;
  },

  async findByBebe(bebeId) {
    const result = await query(
      'SELECT * FROM rendez_vous WHERE bebe_id = $1 ORDER BY date_creation DESC',
      [bebeId],
    );
    return result.rows;
  },

  async updateStatus(id, statut, numero_attente = null) {
    const params = [id, statut];
    let sql = 'UPDATE rendez_vous SET statut = $2';
    if (numero_attente !== null) {
      sql += ', numero_attente = $3';
      params.push(numero_attente);
    }
    sql += ' WHERE id = $1 RETURNING *';
    const result = await query(sql, params);
    return result.rows[0];
  },

  async getStatsBySession(sessionId) {
    const result = await query(
      `SELECT statut, COUNT(*) as count FROM rendez_vous 
       WHERE session_id = $1 GROUP BY statut`,
      [sessionId],
    );
    return result.rows;
  },

  async countActiveBySession(sessionId) {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM rendez_vous
       WHERE session_id = $1 AND statut <> 'ANNULE'`,
      [sessionId],
    );
    return result.rows[0].count;
  },
};

module.exports = RendezVous;
