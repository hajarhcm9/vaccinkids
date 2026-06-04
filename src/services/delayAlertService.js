const { pool } = require('../config/database');

/**
 * DelayAlertService
 * Manages detection and notification of delayed vaccinations.
 * A vaccine is considered delayed if > 7 days past the target date.
 */
class DelayAlertService {
  /**
   * Get delayed vaccines for a specific baby.
   * Uses EXTRACT(EPOCH FROM interval) / 86400 to get days as numeric.
   */
  async getDelayedVaccinesForBebe(bebeId) {
    const res = await pool.query(
      `
      SELECT
        b.id AS bebe_id, b.prenom AS bebe_prenom, b.nom AS bebe_nom,
        b.date_naissance,
        v.id AS vaccin_id, v.nom AS vaccin_nom,
        v.age_cible_semaines,
        (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week'))::date AS date_prevue,
        (EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400)::integer AS jours_retard,
        p.id AS parent_id, p.telephone AS parent_telephone,
        p.nom AS parent_nom, p.prenom AS parent_prenom
      FROM bebe b
      CROSS JOIN vaccin v
      JOIN parent p ON p.id = b.parent_id
      WHERE b.id = $1
        AND v.est_actif = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
        )
        AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
      ORDER BY jours_retard DESC
    `,
      [bebeId],
    );
    return res.rows;
  }

  /**
   * Get all delayed vaccines for a specific centre.
   * Returns babies grouped by delay severity.
   */
  async getDelayedVaccinesByCentre(centreId) {
    const res = await pool.query(
      `
      SELECT
        b.id AS bebe_id, b.prenom AS bebe_prenom, b.nom AS bebe_nom,
        b.date_naissance,
        v.id AS vaccin_id, v.nom AS vaccin_nom,
        v.age_cible_semaines,
        (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week'))::date AS date_prevue,
        (EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400)::integer AS jours_retard,
        p.id AS parent_id, p.telephone AS parent_telephone,
        p.nom AS parent_nom, p.prenom AS parent_prenom,
        $1::integer AS centre_id
      FROM bebe b
      CROSS JOIN vaccin v
      JOIN parent p ON p.id = b.parent_id
      WHERE v.est_actif = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
        )
        AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
        AND EXISTS (
          SELECT 1 FROM rendez_vous rdv2
          JOIN session s2 ON s2.id = rdv2.session_id
          WHERE rdv2.bebe_id = b.id AND s2.centre_id = $1
        )
      ORDER BY jours_retard DESC
      LIMIT 500
    `,
      [centreId],
    );

    const severe = res.rows.filter((r) => parseInt(r.jours_retard) > 30);
    const moderate = res.rows.filter(
      (r) => parseInt(r.jours_retard) > 7 && parseInt(r.jours_retard) <= 30,
    );
    const mild = res.rows.filter((r) => parseInt(r.jours_retard) <= 7);

    return {
      totalRetards: res.rows.length,
      bySeverity: {
        severe: { count: severe.length, label: '> 30 jours' },
        moderate: { count: moderate.length, label: '8-30 jours' },
        mild: { count: mild.length, label: '<= 7 jours' },
      },
      retards: res.rows,
    };
  }

  /**
   * Get a dashboard overview of all delayed vaccines across all centres.
   * Uses separate optimized queries instead of complex CROSS JOINs.
   */
  async getDelayDashboard() {
    // Total delayed vaccines - simplified without CROSS JOIN
    const totalRes = await pool.query(`
      SELECT COUNT(*) AS total
      FROM bebe b
      CROSS JOIN vaccin v
      WHERE v.est_actif = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
        )
        AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
    `);

    // Urgent: more than 30 days delayed
    const urgentRes = await pool.query(`
      SELECT COUNT(*) AS urgent_count
      FROM bebe b
      CROSS JOIN vaccin v
      WHERE v.est_actif = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
        )
        AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '30 days')
    `);

    // Top delayed vaccines - use EXTRACT instead of ::numeric on interval
    const vaccineRes = await pool.query(`
      SELECT v.id AS vaccin_id, v.nom AS vaccin_nom,
             v.age_cible_semaines,
             COUNT(*) AS nb_enfants_retard,
             ROUND(AVG(
               EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400
             ))::integer AS avg_jours_retard
      FROM bebe b
      CROSS JOIN vaccin v
      WHERE v.est_actif = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
        )
        AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
      GROUP BY v.id, v.nom, v.age_cible_semaines
      ORDER BY nb_enfants_retard DESC
      LIMIT 10
    `);

    // By centre - simplified without CROSS JOIN
    const centreRes = await pool.query(`
      SELECT c.id AS centre_id, c.nom AS centre_nom,
             COUNT(DISTINCT rdv.bebe_id) AS nb_retards
      FROM centre c
      JOIN session s ON s.centre_id = c.id
      JOIN rendez_vous rdv ON rdv.session_id = s.id
      JOIN bebe b ON b.id = rdv.bebe_id
      WHERE rdv.statut != 'ANNULE'
      GROUP BY c.id, c.nom
      ORDER BY nb_retards DESC
    `);

    return {
      totalRetards: parseInt(totalRes.rows[0]?.total) || 0,
      urgentCount: parseInt(urgentRes.rows[0]?.urgent_count) || 0,
      byCentre: centreRes.rows,
      topDelayedVaccines: vaccineRes.rows,
    };
  }

  /**
   * Send delay alert notifications to parents of delayed children.
   * Limited to prevent timeouts.
   */
  async sendDelayAlerts(centreId) {
    let retards;
    if (centreId) {
      const result = await this.getDelayedVaccinesByCentre(centreId);
      retards = result.retards;
    } else {
      // Get delayed vaccines with a limit
      const res = await pool.query(`
        SELECT
          b.id AS bebe_id, b.prenom AS bebe_prenom, b.nom AS bebe_nom,
          v.nom AS vaccin_nom,
          (EXTRACT(EPOCH FROM (CURRENT_DATE - (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')))) / 86400)::integer AS jours_retard,
          p.id AS parent_id, p.telephone AS parent_telephone
        FROM bebe b
        CROSS JOIN vaccin v
        JOIN parent p ON p.id = b.parent_id
        WHERE v.est_actif = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM vaccination vac
            JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
            JOIN session s ON s.id = rdv.session_id
            WHERE rdv.bebe_id = b.id AND s.vaccin_id = v.id
          )
          AND CURRENT_DATE > (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week') + INTERVAL '7 days')
        LIMIT 100
      `);
      retards = res.rows;
    }

    let sent = 0;
    let failed = 0;

    // Try to use notification service if available
    let notificationService;
    try {
      notificationService = require('./notificationService');
    } catch (e) {
      notificationService = null;
    }

    for (const retard of retards) {
      try {
        if (notificationService && notificationService.sendNotification) {
          await notificationService.sendNotification({
            destinataire_id: retard.parent_id,
            destinataire_type: 'parent',
            type: 'ALERTE_STOCK',
            canal: 'in_app',
            titre: 'Retard vaccinal detecte',
            message:
              'Le vaccin ' +
              retard.vaccin_nom +
              ' pour ' +
              retard.bebe_prenom +
              ' est en retard de ' +
              retard.jours_retard +
              ' jours. Veuillez prendre rendez-vous.',
            reference_id: retard.bebe_id,
            reference_type: 'bebe',
          });
        }
        sent++;
      } catch (err) {
        failed++;
      }
    }

    return { sent, failed, total: retards.length };
  }
}

module.exports = new DelayAlertService();
