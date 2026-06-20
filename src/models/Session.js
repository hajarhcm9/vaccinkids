const { pool, query } = require('../config/database');

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
  async create(data, clientArg = null) {
    const { centre_id, vaccin_id, date_session, heure_debut, heure_fin, statut } = data;
    let { max_inscriptions } = data;

    const run = clientArg ? (sql, vals) => clientArg.query(sql, vals) : query;

    if (!max_inscriptions && vaccin_id) {
      const vaccinRes = await run('SELECT doses_par_flacon FROM vaccin WHERE id = $1', [vaccin_id]);
      max_inscriptions = vaccinRes.rows[0]?.doses_par_flacon ?? 10;
    }

    const result = await run(
      `INSERT INTO session (centre_id, vaccin_id, date_session, heure_debut, heure_fin, max_inscriptions, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [centre_id, vaccin_id, date_session, heure_debut, heure_fin, max_inscriptions, statut || 'EN_FORMATION'],
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

  // Returns sessions for a given vaccine, sorted by fill rate DESC (closest to full first).
  // EN_FORMATION sessions come before CONFIRMEE (waitlist).
  async findSmartMatch({ centreId, vaccinId }) {
    const result = await query(
      `SELECT s.*, c.nom AS centre_nom, v.nom AS vaccin_nom,
              v.doses_par_flacon,
              COUNT(rdv.id) FILTER (WHERE rdv.statut NOT IN ('ANNULE','EN_LISTE_ATTENTE'))::int AS inscrits,
              ROUND(
                COUNT(rdv.id) FILTER (WHERE rdv.statut NOT IN ('ANNULE','EN_LISTE_ATTENTE'))::numeric
                / NULLIF(s.max_inscriptions, 0) * 100
              )::int AS fill_pct
       FROM session s
       LEFT JOIN centre c        ON c.id = s.centre_id
       LEFT JOIN vaccin v        ON v.id = s.vaccin_id
       LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
       WHERE s.centre_id = $1
         AND s.vaccin_id = $2
         AND s.date_session >= CURRENT_DATE
         AND s.statut IN ('EN_FORMATION','PLANIFIEE','CONFIRMEE')
       GROUP BY s.id, c.nom, v.nom, v.doses_par_flacon
       ORDER BY
         CASE s.statut
           WHEN 'EN_FORMATION' THEN 0
           WHEN 'PLANIFIEE'    THEN 1
           WHEN 'CONFIRMEE'    THEN 2
           ELSE 3
         END,
         fill_pct DESC,
         s.date_session ASC`,
      [centreId, vaccinId],
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

  async transition(id, nextStatus, allowedCurrentStatuses) {
    const result = await query(
      `UPDATE session
       SET statut = $2
       WHERE id = $1 AND statut = ANY($3::varchar[])
       RETURNING *`,
      [id, nextStatus, allowedCurrentStatuses],
    );
    return result.rows[0];
  },

  async endAndMarkAbsent(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE session
         SET statut = 'TERMINEE'
         WHERE id = $1 AND statut = 'EN_COURS'
         RETURNING *`,
        [id],
      );
      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(
        `UPDATE rendez_vous
         SET statut = 'ABSENT'
         WHERE session_id = $1 AND statut IN ('CONFIRME', 'EN_ATTENTE')`,
        [id],
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = Session;
