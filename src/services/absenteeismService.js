const { pool } = require('../config/database');

/**
 * AbsenteeismService
 * Manages automatic absence detection, waitlist promotion,
 * and habitual absent parent tracking.
 */
class AbsenteeismService {
  /**
   * Process no-shows for a session that is EN_COURS.
   */
  async processSessionNoShows(sessionId, gracePeriodMinutes = 15) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRes = await client.query(
        'SELECT id, statut, date_session, heure_debut, centre_id FROM session WHERE id = $1 FOR UPDATE',
        [sessionId]
      );
      if (sessionRes.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return { processed: false, error: 'Session non trouvee' };
      }
      const session = sessionRes.rows[0];

      if (session.statut !== 'EN_COURS') {
        await client.query('ROLLBACK');
        client.release();
        return { processed: false, error: 'La session n\'est pas EN_COURS' };
      }

      // Check if grace period has elapsed
      const sessionStart = new Date(session.date_session + 'T' + session.heure_debut);
      const now = new Date();
      const elapsedMinutes = (now - sessionStart) / 60000;

      if (elapsedMinutes < gracePeriodMinutes) {
        await client.query('ROLLBACK');
        client.release();
        return {
          processed: false,
          error: 'Delai de grace non ecoule',
          minutesRemaining: Math.ceil(gracePeriodMinutes - elapsedMinutes),
        };
      }

      // Find all CONFIRME and EN_ATTENTE RDVs that haven't shown up
      const noShowsRes = await client.query(
        'SELECT id, parent_id, bebe_id, statut FROM rendez_vous WHERE session_id = $1 AND statut IN ($2, $3) FOR UPDATE',
        [sessionId, 'CONFIRME', 'EN_ATTENTE']
      );

      const markedAbsent = [];
      const promoted = [];
      const errors = [];

      for (const rdv of noShowsRes.rows) {
        try {
          // Mark as ABSENT
          await client.query(
            'UPDATE rendez_vous SET statut = $1, updated_at = NOW() WHERE id = $2',
            ['ABSENT', rdv.id]
          );

          // Increment parent consecutive absence counter
          await client.query(
            'UPDATE parent SET nb_absences_consecutives = nb_absences_consecutives + 1, updated_at = NOW() WHERE id = $1',
            [rdv.parent_id]
          );

          // Get parent info
          const parentRes = await client.query(
            'SELECT id, telephone, nom, prenom, nb_absences_consecutives FROM parent WHERE id = $1',
            [rdv.parent_id]
          );
          const parent = parentRes.rows[0];

          markedAbsent.push({
            rdvId: rdv.id,
            parentId: rdv.parent_id,
            totalAbsences: parent.nb_absences_consecutives,
          });

          // Check if we should promote someone from waitlist
          const nextWaitlisted = await client.query(
            'SELECT id, parent_id, bebe_id FROM rendez_vous WHERE session_id = $1 AND statut = $2 ORDER BY date_creation ASC LIMIT 1 FOR UPDATE',
            [sessionId, 'EN_LISTE_ATTENTE']
          );

          if (nextWaitlisted.rows.length > 0) {
            const wl = nextWaitlisted.rows[0];
            await client.query(
              'UPDATE rendez_vous SET statut = $1, updated_at = NOW() WHERE id = $2',
              ['EN_ATTENTE', wl.id]
            );
            promoted.push({
              rdvId: wl.id,
              parentId: wl.parent_id,
            });
          }

          // Log to audit
          try {
            await client.query(
              'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
              [
                'rendez_vous',
                rdv.id,
                'UPDATE',
                JSON.stringify({ statut: rdv.statut }),
                JSON.stringify({ statut: 'ABSENT', reason: 'no_show_auto' }),
                'system',
              ]
            );
          } catch (auditErr) {
            // Audit log failure should not block the main operation
          }

        } catch (err) {
          errors.push({ rdvId: rdv.id, error: err.message });
        }
      }

      await client.query('COMMIT');
      client.release();
      return { processed: true, markedAbsent, promoted, errors };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      client.release();
      // Return error object instead of throwing
      return { processed: false, error: err.message };
    }
  }

  /**
   * Mark a single RDV as ABSENT manually (nurse action).
   */
  async markAbsentManual(rdvId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rdvRes = await client.query(
        'SELECT id, session_id, parent_id, bebe_id, statut FROM rendez_vous WHERE id = $1 FOR UPDATE',
        [rdvId]
      );
      if (rdvRes.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return { error: 'Rendez-vous non trouve' };
      }
      const rdv = rdvRes.rows[0];

      if (rdv.statut === 'ABSENT') {
        await client.query('ROLLBACK');
        client.release();
        return { error: 'Le rendez-vous est deja marque absent' };
      }
      if (rdv.statut === 'ANNULE') {
        await client.query('ROLLBACK');
        client.release();
        return { error: 'Impossible de marquer absent un RDV annule' };
      }
      if (rdv.statut === 'PRESENT') {
        await client.query('ROLLBACK');
        client.release();
        return { error: 'Impossible de marquer absent un parent present' };
      }

      const oldStatut = rdv.statut;

      // Mark as ABSENT
      await client.query(
        'UPDATE rendez_vous SET statut = $1, updated_at = NOW() WHERE id = $2',
        ['ABSENT', rdvId]
      );

      // Increment parent consecutive absence counter
      await client.query(
        'UPDATE parent SET nb_absences_consecutives = nb_absences_consecutives + 1, updated_at = NOW() WHERE id = $1',
        [rdv.parent_id]
      );

      // Get updated parent info
      const parentRes = await client.query(
        'SELECT id, telephone, nom, prenom, nb_absences_consecutives FROM parent WHERE id = $1',
        [rdv.parent_id]
      );
      const parent = parentRes.rows[0];
      const isHabitualAbsent = parent.nb_absences_consecutives >= 2;

      // Try to promote next waitlisted RDV
      let promotedRdv = null;
      const nextWlRes = await client.query(
        'SELECT id, parent_id, bebe_id FROM rendez_vous WHERE session_id = $1 AND statut = $2 ORDER BY date_creation ASC LIMIT 1 FOR UPDATE',
        [rdv.session_id, 'EN_LISTE_ATTENTE']
      );

      if (nextWlRes.rows.length > 0) {
        const wl = nextWlRes.rows[0];
        await client.query(
          'UPDATE rendez_vous SET statut = $1, updated_at = NOW() WHERE id = $2',
          ['EN_ATTENTE', wl.id]
        );
        promotedRdv = { rdvId: wl.id, parentId: wl.parent_id };
      }

      // Audit log (non-blocking)
      try {
        await client.query(
          'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            'rendez_vous',
            rdvId,
            'UPDATE',
            JSON.stringify({ statut: oldStatut }),
            JSON.stringify({ statut: 'ABSENT', reason: 'no_show_manual' }),
            'infirmier',
          ]
        );
      } catch (auditErr) {
        // Non-blocking
      }

      await client.query('COMMIT');
      client.release();
      return { rdv: { id: rdvId, statut: 'ABSENT' }, parent, promotedRdv, isHabitualAbsent };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (e) {}
      client.release();
      return { error: err.message };
    }
  }

  /**
   * Reset a parent's consecutive absence counter (when they show up).
   */
  async resetConsecutiveAbsences(parentId) {
    await pool.query(
      'UPDATE parent SET nb_absences_consecutives = 0, updated_at = NOW() WHERE id = $1',
      [parentId]
    );
  }

  /**
   * Get parents with habitual absenteeism (2+ consecutive absences).
   */
  async getHabitualAbsents(centreId) {
    let query = `
      SELECT p.id, p.telephone, p.nom, p.prenom, p.nb_absences_consecutives,
             COUNT(rdv.id) AS total_absences,
             MAX(s.date_session) AS derniere_absence_date
      FROM parent p
      JOIN rendez_vous rdv ON rdv.parent_id = p.id AND rdv.statut = 'ABSENT'
      JOIN session s ON s.id = rdv.session_id
      WHERE p.nb_absences_consecutives >= 2
    `;
    const params = [];
    if (centreId) {
      params.push(centreId);
      query += ` AND s.centre_id = $${params.length}`;
    }
    query += `
      GROUP BY p.id, p.telephone, p.nom, p.prenom, p.nb_absences_consecutives
      ORDER BY p.nb_absences_consecutives DESC, total_absences DESC
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }

  /**
   * Get absence history for a specific parent.
   */
  async getParentAbsenceHistory(parentId) {
    const res = await pool.query(`
      SELECT rdv.id AS rdv_id, rdv.statut, rdv.updated_at,
             s.date_session, s.heure_debut,
             v.nom AS vaccin_nom,
             b.prenom AS bebe_prenom, b.nom AS bebe_nom
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      JOIN vaccin v ON v.id = s.vaccin_id
      JOIN bebe b ON b.id = rdv.bebe_id
      WHERE rdv.parent_id = $1 AND rdv.statut = 'ABSENT'
      ORDER BY s.date_session DESC
    `, [parentId]);
    return res.rows;
  }

  /**
   * Get all absences for a specific session.
   */
  async getSessionAbsences(sessionId) {
    const res = await pool.query(`
      SELECT rdv.id AS rdv_id, rdv.updated_at,
             p.id AS parent_id, p.telephone, p.nom AS parent_nom, p.prenom AS parent_prenom,
             p.nb_absences_consecutives,
             b.prenom AS bebe_prenom, b.nom AS bebe_nom
      FROM rendez_vous rdv
      JOIN parent p ON p.id = rdv.parent_id
      JOIN bebe b ON b.id = rdv.bebe_id
      WHERE rdv.session_id = $1 AND rdv.statut = 'ABSENT'
      ORDER BY rdv.updated_at DESC
    `, [sessionId]);
    return res.rows;
  }

  /**
   * Get global absenteeism statistics.
   */
  async getAbsenteismeStats() {
    const globalRes = await pool.query(`
      SELECT
        COUNT(*) AS total_rdvs,
        SUM(CASE WHEN statut = 'ABSENT' THEN 1 ELSE 0 END) AS total_absences,
        ROUND(
          SUM(CASE WHEN statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS taux_absenteisme
      FROM rendez_vous
      WHERE statut IN ('PRESENT', 'ABSENT', 'CONFIRME', 'EN_ATTENTE')
    `);

    const monthRes = await pool.query(`
      SELECT TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
             COUNT(*) AS nb_rdvs,
             SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absences,
             ROUND(
               SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
               / NULLIF(COUNT(*), 0) * 100, 1
             ) AS taux_absenteisme
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE rdv.statut IN ('PRESENT', 'ABSENT', 'CONFIRME', 'EN_ATTENTE')
      GROUP BY TO_CHAR(s.date_session, 'YYYY-MM')
      ORDER BY mois DESC
      LIMIT 12
    `);

    const centreRes = await pool.query(`
      SELECT c.id AS centre_id, c.nom AS centre_nom,
             COUNT(*) AS nb_rdvs,
             SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absences,
             ROUND(
               SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
               / NULLIF(COUNT(*), 0) * 100, 1
             ) AS taux_absenteisme
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      JOIN centre c ON c.id = s.centre_id
      WHERE rdv.statut IN ('PRESENT', 'ABSENT', 'CONFIRME', 'EN_ATTENTE')
      GROUP BY c.id, c.nom
      ORDER BY taux_absenteisme DESC
    `);

    const global = globalRes.rows[0] || {};
    return {
      totalAbsences: parseInt(global.total_absences) || 0,
      totalRdvs: parseInt(global.total_rdvs) || 0,
      tauxAbsenteisme: parseFloat(global.taux_absenteisme) || 0,
      byMonth: monthRes.rows,
      byCentre: centreRes.rows,
    };
  }

  /**
   * Start the cron service that automatically processes no-shows.
   */
  startAutoMarkAbsentCron(checkIntervalMs = 60000) {
    const intervalId = setInterval(async () => {
      try {
        const sessionsRes = await pool.query(
          "SELECT id FROM session WHERE statut = 'EN_COURS'"
        );
        for (const session of sessionsRes.rows) {
          await this.processSessionNoShows(session.id);
        }
      } catch (err) {
        console.error('[AbsenteeismCron] Error:', err.message);
      }
    }, checkIntervalMs);

    return {
      stop() {
        clearInterval(intervalId);
        console.log('[AbsenteeismCron] Stopped');
      },
    };
  }
}

module.exports = new AbsenteeismService();
