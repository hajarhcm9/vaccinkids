const { query } = require('../config/database');

const Session = {
  async create(data) {
    const { centre_id, vaccin_id, date_session, heure_debut, heure_fin, max_inscriptions, statut } =
      data;
    const result = await query(
      `INSERT INTO session (centre_id, vaccin_id, date_session, heure_debut, heure_fin, max_inscriptions, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        centre_id,
        vaccin_id,
        date_session,
        heure_debut,
        heure_fin,
        max_inscriptions,
        statut || 'EN_FORMATION',
      ],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM session WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.centreId) {
      values.push(filters.centreId);
      conditions.push(`centre_id = $${values.length}`);
    }

    if (filters.vaccinId) {
      values.push(filters.vaccinId);
      conditions.push(`vaccin_id = $${values.length}`);
    }

    if (filters.dateSession) {
      values.push(filters.dateSession);
      conditions.push(`date_session = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT * FROM session${whereClause} ORDER BY date_session`, values);
    return result.rows;
  },

  async findByCentre(centreId, dateRange) {
    const result = await query(
      'SELECT * FROM session WHERE centre_id = $1 AND date_session BETWEEN $2 AND $3 ORDER BY date_session',
      [centreId, dateRange.start, dateRange.end],
    );
    return result.rows;
  },

  async findUpcoming(centreId) {
    const result = await query(
      'SELECT * FROM session WHERE centre_id = $1 AND date_session >= CURRENT_DATE ORDER BY date_session LIMIT 10',
      [centreId],
    );
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['statut', 'max_inscriptions'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE session SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },
};

module.exports = Session;
