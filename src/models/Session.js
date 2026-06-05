const { query } = require('../config/database');

const SESSION_SELECT =
  'SELECT s.*, c.nom AS centre_nom, c.adresse AS centre_adresse, ' +
  'c.gps_lat AS centre_gps_lat, c.gps_lng AS centre_gps_lng, v.nom AS vaccin_nom, ' +
  "COUNT(rdv.id) FILTER (WHERE rdv.statut NOT IN ('ANNULE', 'EN_LISTE_ATTENTE'))::int AS inscrits " +
  'FROM session s ' +
  'LEFT JOIN centre c ON c.id = s.centre_id ' +
  'LEFT JOIN vaccin v ON v.id = s.vaccin_id ' +
  'LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id ';

const SESSION_GROUP_BY = ' GROUP BY s.id, c.nom, c.adresse, c.gps_lat, c.gps_lng, v.nom';

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
    const result = await query(SESSION_SELECT + 'WHERE s.id = $1' + SESSION_GROUP_BY, [id]);
    return result.rows[0];
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];

    if (filters.centreId) {
      values.push(filters.centreId);
      conditions.push(`s.centre_id = $${values.length}`);
    }

    if (filters.vaccinId) {
      values.push(filters.vaccinId);
      conditions.push(`s.vaccin_id = $${values.length}`);
    }

    if (filters.dateSession) {
      values.push(filters.dateSession);
      conditions.push(`s.date_session = $${values.length}`);
    }

    if (filters.upcomingOnly) {
      conditions.push('s.date_session >= CURRENT_DATE');
      conditions.push("s.statut NOT IN ('ANNULEE', 'TERMINEE')");
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      SESSION_SELECT + whereClause + SESSION_GROUP_BY + ' ORDER BY s.date_session, s.heure_debut',
      values,
    );
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
    const allowedFields = [
      'centre_id',
      'vaccin_id',
      'date_session',
      'heure_debut',
      'heure_fin',
      'max_inscriptions',
      'statut',
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
      `UPDATE session SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },
};

module.exports = Session;
