const { pool } = require('../config/database');

/**
 * StatsService
 * Provides comprehensive statistics and dashboard data.
 * Leverages existing DB views and adds custom queries.
 */
class StatsService {
  /**
   * Get the global dashboard KPIs.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Dashboard data with KPIs
   */
  async getDashboard(centreId) {
    // Total babies
    let bebeTotal = 0;
    if (centreId) {
      const r = await pool.query(
        'SELECT COUNT(DISTINCT b.id) AS total FROM bebe b JOIN rendez_vous rdv ON rdv.bebe_id = b.id JOIN session s ON s.id = rdv.session_id WHERE s.centre_id = $1',
        [centreId]
      );
      bebeTotal = parseInt(r.rows[0]?.total) || 0;
    } else {
      const r = await pool.query('SELECT COUNT(*) AS total FROM bebe');
      bebeTotal = parseInt(r.rows[0]?.total) || 0;
    }

    // Total parents
    const parentRes = await pool.query('SELECT COUNT(*) AS total FROM parent');
    const totalParents = parseInt(parentRes.rows[0]?.total) || 0;

    // Total centres
    const centreRes = await pool.query('SELECT COUNT(*) AS total FROM centre WHERE est_actif = TRUE');
    const totalCentres = parseInt(centreRes.rows[0]?.total) || 0;

    // Total vaccinations done
    let totalVaccinations = 0;
    if (centreId) {
      const r = await pool.query(
        'SELECT COUNT(*) AS total FROM vaccination vac JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id JOIN session s ON s.id = rdv.session_id WHERE s.centre_id = $1',
        [centreId]
      );
      totalVaccinations = parseInt(r.rows[0]?.total) || 0;
    } else {
      const r = await pool.query('SELECT COUNT(*) AS total FROM vaccination');
      totalVaccinations = parseInt(r.rows[0]?.total) || 0;
    }

    // Total RDVs
    let totalRdvs = 0;
    if (centreId) {
      const r = await pool.query(
        'SELECT COUNT(*) AS total FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id WHERE s.centre_id = $1',
        [centreId]
      );
      totalRdvs = parseInt(r.rows[0]?.total) || 0;
    } else {
      const r = await pool.query('SELECT COUNT(*) AS total FROM rendez_vous');
      totalRdvs = parseInt(r.rows[0]?.total) || 0;
    }

    // Absenteeism rate
    let absentData = {};
    if (centreId) {
      const r = await pool.query(
        `SELECT
           COUNT(*) AS total_rdvs,
           SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS total_absences,
           ROUND(
             SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
             / NULLIF(COUNT(*), 0) * 100, 1
           ) AS taux_absenteisme
         FROM rendez_vous rdv
         JOIN session s ON s.id = rdv.session_id
         WHERE s.centre_id = $1 AND rdv.statut IN ('PRESENT', 'ABSENT')`,
        [centreId]
      );
      absentData = r.rows[0] || {};
    } else {
      const r = await pool.query(`
        SELECT
          COUNT(*) AS total_rdvs,
          SUM(CASE WHEN statut = 'ABSENT' THEN 1 ELSE 0 END) AS total_absences,
          ROUND(
            SUM(CASE WHEN statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
            / NULLIF(COUNT(*), 0) * 100, 1
          ) AS taux_absenteisme
        FROM rendez_vous WHERE statut IN ('PRESENT', 'ABSENT')
      `);
      absentData = r.rows[0] || {};
    }

    // Upcoming sessions (next 7 days)
    let sessionsAvenir = 0;
    if (centreId) {
      const r = await pool.query(
        `SELECT COUNT(*) AS total FROM session
         WHERE date_session BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
         AND statut IN ('PLANIFIEE', 'CONFIRMEE') AND centre_id = $1`,
        [centreId]
      );
      sessionsAvenir = parseInt(r.rows[0]?.total) || 0;
    } else {
      const r = await pool.query(`
        SELECT COUNT(*) AS total FROM session
        WHERE date_session BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND statut IN ('PLANIFIEE', 'CONFIRMEE')
      `);
      sessionsAvenir = parseInt(r.rows[0]?.total) || 0;
    }

    // Low stock alerts
    let alertesStock = 0;
    if (centreId) {
      const r = await pool.query(
        'SELECT COUNT(*) AS total FROM stock WHERE quantite_disponible <= seuil_alerte AND centre_id = $1',
        [centreId]
      );
      alertesStock = parseInt(r.rows[0]?.total) || 0;
    } else {
      const r = await pool.query('SELECT COUNT(*) AS total FROM stock WHERE quantite_disponible <= seuil_alerte');
      alertesStock = parseInt(r.rows[0]?.total) || 0;
    }

    // Habitual absents count
    const habitualRes = await pool.query(
      'SELECT COUNT(*) AS total FROM parent WHERE nb_absences_consecutives >= 2'
    );
    const absentsHabituels = parseInt(habitualRes.rows[0]?.total) || 0;

    // Delayed vaccines count
    const delayedRes = await pool.query(`
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
    const retardsVaccinaux = parseInt(delayedRes.rows[0]?.total) || 0;

    return {
      kpis: {
        totalBebes: bebeTotal,
        totalParents,
        totalCentres,
        totalVaccinations,
        totalRdvs,
        tauxAbsenteisme: parseFloat(absentData.taux_absenteisme) || 0,
        sessionsAvenir7Jours: sessionsAvenir,
        alertesStockBas: alertesStock,
        absentsHabituels,
        retardsVaccinaux,
      },
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get vaccination coverage statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Coverage data per vaccine and per centre
   */
  async getCouvertureVaccinale(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    // Coverage per vaccine
    const vaccineRes = await pool.query(`
      SELECT
        v.id AS vaccin_id,
        v.nom AS vaccin_nom,
        v.age_cible_semaines,
        COALESCE(eligible.cnt, 0) AS total_bebes_eligibles,
        COALESCE(vaccinated.cnt, 0) AS total_vaccines,
        CASE
          WHEN COALESCE(eligible.cnt, 0) > 0
          THEN ROUND(COALESCE(vaccinated.cnt, 0)::numeric / eligible.cnt * 100, 1)
          ELSE 0
        END AS taux_couverture
      FROM vaccin v
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT b.id) AS cnt
        FROM bebe b
        WHERE (b.date_naissance + (v.age_cible_semaines * INTERVAL '1 week')) <= CURRENT_DATE
        ${centreId ? 'AND EXISTS (SELECT 1 FROM rendez_vous rdv2 JOIN session s2 ON s2.id = rdv2.session_id WHERE rdv2.bebe_id = b.id AND s2.centre_id = $1)' : ''}
      ) eligible ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT vac.id) AS cnt
        FROM vaccination vac
        JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
        JOIN session s ON s.id = rdv.session_id
        WHERE s.vaccin_id = v.id
        ${centreId ? 'AND s.centre_id = $1' : ''}
      ) vaccinated ON TRUE
      WHERE v.est_actif = TRUE
      ORDER BY v.age_cible_semaines ASC
    `, params);

    // Coverage per centre
    const centreRes = await pool.query(`
      SELECT
        c.id AS centre_id,
        c.nom AS centre_nom,
        COUNT(DISTINCT vac.id) AS total_vaccinations,
        COUNT(DISTINCT rdv.bebe_id) AS total_bebes_vaccines,
        COUNT(DISTINCT rdv.id) AS total_rdvs
      FROM centre c
      LEFT JOIN session s ON s.centre_id = c.id
      LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
      LEFT JOIN vaccination vac ON vac.rendez_vous_id = rdv.id
      WHERE c.est_actif = TRUE
      GROUP BY c.id, c.nom
      ORDER BY total_vaccinations DESC
    `);

    // Global coverage rate
    const globalRes = await pool.query(`
      SELECT
        COUNT(DISTINCT bebe_vacc.id) AS bebes_avec_au_moins_1_vaccin,
        (SELECT COUNT(*) FROM bebe) AS total_bebes,
        ROUND(
          COUNT(DISTINCT bebe_vacc.id)::numeric
          / NULLIF((SELECT COUNT(*) FROM bebe), 0) * 100, 1
        ) AS taux_couverture_global
      FROM bebe bebe_vacc
      WHERE EXISTS (
        SELECT 1 FROM vaccination vac2
        JOIN rendez_vous rdv2 ON rdv2.id = vac2.rendez_vous_id
        WHERE rdv2.bebe_id = bebe_vacc.id
      )
    `);

    const global = globalRes.rows[0] || {};

    return {
      tauxCouvertureGlobal: parseFloat(global.taux_couverture_global) || 0,
      bebesVaccines: parseInt(global.bebes_avec_au_moins_1_vaccin) || 0,
      totalBebes: parseInt(global.total_bebes) || 0,
      parVaccin: vaccineRes.rows,
      parCentre: centreRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get session statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Session statistics
   */
  async getSessionStats(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    const cFilter = centreId ? ' AND s.centre_id = $1' : '';

    // Status distribution
    const statusRes = await pool.query(`
      SELECT s.statut, COUNT(*) AS nb
      FROM session s WHERE 1=1 ${cFilter}
      GROUP BY s.statut ORDER BY nb DESC
    `, params);

    // Fill rate per session
    const fillRes = await pool.query(`
      SELECT
        s.id, s.date_session, v.nom AS vaccin_nom, c.nom AS centre_nom,
        s.max_inscriptions,
        COUNT(rdv.id) AS nb_inscrits,
        ROUND(COUNT(rdv.id)::numeric / NULLIF(s.max_inscriptions, 0) * 100, 1) AS taux_remplissage
      FROM session s
      JOIN vaccin v ON v.id = s.vaccin_id
      JOIN centre c ON c.id = s.centre_id
      LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
      WHERE 1=1 ${cFilter}
      GROUP BY s.id, s.date_session, v.nom, c.nom, s.max_inscriptions
      ORDER BY s.date_session DESC
      LIMIT 50
    `, params);

    // Average fill rate
    const avgFillRes = await pool.query(`
      SELECT
        ROUND(AVG(nb_inscrits::numeric / NULLIF(max_inscriptions, 0) * 100), 1) AS avg_taux_remplissage
      FROM (
        SELECT s.max_inscriptions, COUNT(rdv.id) AS nb_inscrits
        FROM session s
        LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
        WHERE 1=1 ${cFilter}
        GROUP BY s.id, s.max_inscriptions
      ) sub
    `, params);

    // Monthly sessions count
    const monthlyRes = await pool.query(`
      SELECT
        TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
        COUNT(*) AS nb_sessions,
        SUM(CASE WHEN s.statut = 'TERMINEE' THEN 1 ELSE 0 END) AS nb_terminees,
        SUM(CASE WHEN s.statut = 'ANNULEE' THEN 1 ELSE 0 END) AS nb_annulees
      FROM session s WHERE 1=1 ${cFilter}
      GROUP BY TO_CHAR(s.date_session, 'YYYY-MM')
      ORDER BY mois DESC LIMIT 12
    `, params);

    return {
      statusDistribution: statusRes.rows,
      avgTauxRemplissage: parseFloat(avgFillRes.rows[0]?.avg_taux_remplissage) || 0,
      sessionsRecentes: fillRes.rows,
      tendancesMensuelles: monthlyRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get RDV (appointment) statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} RDV statistics
   */
  async getRdvStats(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    const cFilter = centreId ? ' AND s.centre_id = $1' : '';

    // Status distribution
    const statusRes = await pool.query(`
      SELECT rdv.statut, COUNT(*) AS nb
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE 1=1 ${cFilter}
      GROUP BY rdv.statut ORDER BY nb DESC
    `, params);

    // Monthly trend
    const monthlyRes = await pool.query(`
      SELECT
        TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
        COUNT(*) AS total_rdvs,
        SUM(CASE WHEN rdv.statut = 'PRESENT' THEN 1 ELSE 0 END) AS nb_presents,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absents,
        SUM(CASE WHEN rdv.statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) AS nb_en_attente,
        SUM(CASE WHEN rdv.statut = 'EN_LISTE_ATTENTE' THEN 1 ELSE 0 END) AS nb_en_liste_attente
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE 1=1 ${cFilter}
      GROUP BY TO_CHAR(s.date_session, 'YYYY-MM')
      ORDER BY mois DESC LIMIT 12
    `, params);

    // Daily trend (last 30 days)
    const dailyRes = await pool.query(`
      SELECT
        s.date_session,
        COUNT(*) AS total_rdvs,
        SUM(CASE WHEN rdv.statut = 'PRESENT' THEN 1 ELSE 0 END) AS nb_presents,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absents
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE s.date_session >= CURRENT_DATE - INTERVAL '30 days'
      ${cFilter}
      GROUP BY s.date_session
      ORDER BY s.date_session DESC
    `, params);

    return {
      statusDistribution: statusRes.rows,
      tendancesMensuelles: monthlyRes.rows,
      tendancesQuotidiennes: dailyRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get stock statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Stock statistics
   */
  async getStockStats(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    const cFilter = centreId ? ' AND st.centre_id = $1' : '';

    // Stock overview per vaccine per centre
    const overviewRes = await pool.query(`
      SELECT
        st.centre_id, c.nom AS centre_nom,
        st.vaccin_id, v.nom AS vaccin_nom,
        st.quantite_disponible, st.seuil_alerte,
        CASE WHEN st.quantite_disponible <= st.seuil_alerte THEN TRUE ELSE FALSE END AS est_bas
      FROM stock st
      JOIN centre c ON c.id = st.centre_id
      JOIN vaccin v ON v.id = st.vaccin_id
      WHERE 1=1 ${cFilter}
      ORDER BY est_bas DESC, st.quantite_disponible ASC
    `, params);

    // Low stock count
    const lowStockRes = await pool.query(`
      SELECT COUNT(*) AS total FROM stock st
      WHERE st.quantite_disponible <= st.seuil_alerte ${cFilter}
    `, params);

    // Total stock value (doses)
    const totalRes = await pool.query(`
      SELECT
        SUM(st.quantite_disponible) AS total_doses,
        COUNT(DISTINCT st.vaccin_id) AS nb_vaccins_diff,
        COUNT(DISTINCT st.centre_id) AS nb_centres
      FROM stock st WHERE 1=1 ${cFilter}
    `, params);

    // Vial waste stats
    const wasteRes = await pool.query(`
      SELECT
        v.nom AS vaccin_nom,
        SUM(f.doses_utilisees) AS total_doses_utilisees,
        SUM(f.doses_gaspillees) AS total_doses_gaspillees,
        ROUND(
          SUM(f.doses_gaspillees)::numeric
          / NULLIF(SUM(f.doses_utilisees + f.doses_gaspillees), 0) * 100, 1
        ) AS taux_gaspillage
      FROM flacon f
      JOIN vaccin v ON v.id = f.vaccin_id
      ${centreId ? 'JOIN session s ON s.id = f.session_id AND s.centre_id = $1' : ''}
      GROUP BY v.id, v.nom
      ORDER BY taux_gaspillage DESC
    `, params);

    return {
      alerteStockBas: parseInt(lowStockRes.rows[0]?.total) || 0,
      totalDoses: parseInt(totalRes.rows[0]?.total_doses) || 0,
      nbVaccinsDiff: parseInt(totalRes.rows[0]?.nb_vaccins_diff) || 0,
      nbCentres: parseInt(totalRes.rows[0]?.nb_centres) || 0,
      detailsStock: overviewRes.rows,
      gaspillage: wasteRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get absenteeism statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Absenteeism statistics
   */
  async getAbsenteeismeStats(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    const cFilter = centreId ? ' AND s.centre_id = $1' : '';

    // Global rate
    const globalRes = await pool.query(`
      SELECT
        COUNT(*) AS total_rdvs,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS total_absences,
        ROUND(
          SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS taux_absenteisme
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE rdv.statut IN ('PRESENT', 'ABSENT') ${cFilter}
    `, params);

    // By month
    const monthRes = await pool.query(`
      SELECT
        TO_CHAR(s.date_session, 'YYYY-MM') AS mois,
        COUNT(*) AS nb_rdvs,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absences,
        ROUND(
          SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS taux_absenteisme
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      WHERE rdv.statut IN ('PRESENT', 'ABSENT') ${cFilter}
      GROUP BY TO_CHAR(s.date_session, 'YYYY-MM')
      ORDER BY mois DESC LIMIT 12
    `, params);

    // By centre
    const centreRes = await pool.query(`
      SELECT
        c.id AS centre_id, c.nom AS centre_nom,
        COUNT(*) AS nb_rdvs,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absences,
        ROUND(
          SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS taux_absenteisme
      FROM rendez_vous rdv
      JOIN session s ON s.id = rdv.session_id
      JOIN centre c ON c.id = s.centre_id
      WHERE rdv.statut IN ('PRESENT', 'ABSENT')
      ${centreId ? 'AND s.centre_id = $1' : ''}
      GROUP BY c.id, c.nom
      ORDER BY taux_absenteisme DESC
    `, params);

    // Top absent parents
    const topAbsentsRes = await pool.query(`
      SELECT
        p.id AS parent_id, p.telephone, p.nom, p.prenom,
        p.nb_absences_consecutives,
        COUNT(rdv.id) AS total_absences,
        MAX(s.date_session) AS derniere_absence
      FROM parent p
      JOIN rendez_vous rdv ON rdv.parent_id = p.id AND rdv.statut = 'ABSENT'
      JOIN session s ON s.id = rdv.session_id
      WHERE 1=1 ${cFilter}
      GROUP BY p.id, p.telephone, p.nom, p.prenom, p.nb_absences_consecutives
      ORDER BY total_absences DESC
      LIMIT 10
    `, params);

    const global = globalRes.rows[0] || {};

    return {
      totalAbsences: parseInt(global.total_absences) || 0,
      totalRdvs: parseInt(global.total_rdvs) || 0,
      tauxAbsenteisme: parseFloat(global.taux_absenteisme) || 0,
      parMois: monthRes.rows,
      parCentre: centreRes.rows,
      topAbsents: topAbsentsRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get growth tracking statistics.
   *
   * @param {number} centreId - optional filter by centre
   * @returns {Object} Growth statistics
   */
  async getCroissanceStats(centreId) {
    const params = centreId ? [parseInt(centreId)] : [];
    // Total growth measurements
    const totalRes = await pool.query('SELECT COUNT(*) AS total FROM croissance');

    // Average measurements by age group
    const avgRes = await pool.query(`
      SELECT
        CASE
          WHEN age_semaines <= 8 THEN '0-2 mois'
          WHEN age_semaines <= 26 THEN '2-6 mois'
          WHEN age_semaines <= 52 THEN '6-12 mois'
          WHEN age_semaines <= 104 THEN '12-24 mois'
          ELSE '24+ mois'
        END AS tranche_age,
        COUNT(*) AS nb_mesures,
        ROUND(AVG(poids)::numeric, 2) AS avg_poids,
        ROUND(AVG(taille)::numeric, 2) AS avg_taille
      FROM croissance
      GROUP BY tranche_age
      ORDER BY MIN(age_semaines)
    `);

    // Recent measurements
    const recentRes = await pool.query(`
      SELECT cr.date_mesure, cr.poids, cr.taille, cr.age_semaines,
             b.prenom AS bebe_prenom, b.nom AS bebe_nom
      FROM croissance cr
      JOIN bebe b ON b.id = cr.bebe_id
      ${centreId ? 'WHERE EXISTS (SELECT 1 FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id WHERE rdv.bebe_id = b.id AND s.centre_id = $1)' : ''}
      ORDER BY cr.date_mesure DESC
      LIMIT 20
    `, params);

    return {
      totalMesures: parseInt(totalRes.rows[0]?.total) || 0,
      moyennesParTrancheAge: avgRes.rows,
      mesuresRecentes: recentRes.rows,
      centreId: centreId ? parseInt(centreId) : null,
    };
  }

  /**
   * Get comparison data between centres.
   *
   * @returns {Object} Comparative data per centre
   */
  async getComparaisonCentres() {
    // Vaccinations per centre
    const vaccRes = await pool.query(`
      SELECT
        c.id AS centre_id, c.nom AS centre_nom,
        COUNT(DISTINCT vac.id) AS total_vaccinations,
        COUNT(DISTINCT rdv.bebe_id) AS bebes_vaccines,
        COUNT(DISTINCT s.id) AS total_sessions
      FROM centre c
      LEFT JOIN session s ON s.centre_id = c.id
      LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
      LEFT JOIN vaccination vac ON vac.rendez_vous_id = rdv.id
      WHERE c.est_actif = TRUE
      GROUP BY c.id, c.nom
      ORDER BY total_vaccinations DESC
    `);

    // Absenteeism per centre
    const absRes = await pool.query(`
      SELECT
        c.id AS centre_id, c.nom AS centre_nom,
        COUNT(*) AS nb_rdvs,
        SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END) AS nb_absences,
        ROUND(
          SUM(CASE WHEN rdv.statut = 'ABSENT' THEN 1 ELSE 0 END)::numeric
          / NULLIF(COUNT(*), 0) * 100, 1
        ) AS taux_absenteisme
      FROM centre c
      LEFT JOIN session s ON s.centre_id = c.id
      LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
      WHERE c.est_actif = TRUE AND rdv.statut IN ('PRESENT', 'ABSENT')
      GROUP BY c.id, c.nom
      ORDER BY taux_absenteisme DESC
    `);

    // Stock level per centre
    const stockRes = await pool.query(`
      SELECT
        st.centre_id, c.nom AS centre_nom,
        SUM(st.quantite_disponible) AS total_doses,
        SUM(CASE WHEN st.quantite_disponible <= st.seuil_alerte THEN 1 ELSE 0 END) AS alertes_stock
      FROM stock st
      JOIN centre c ON c.id = st.centre_id
      WHERE c.est_actif = TRUE
      GROUP BY st.centre_id, c.nom
      ORDER BY total_doses DESC
    `);

    return {
      vaccinations: vaccRes.rows,
      absenteisme: absRes.rows,
      stock: stockRes.rows,
    };
  }

  /**
   * Get export data for reporting.
   *
   * @param {string} type - 'vaccinations' | 'absenteisme' | 'sessions' | 'stock'
   * @param {Object} filters - { centreId, dateDebut, dateFin }
   * @returns {Object} Export data
   */
  async getExportData(type, filters = {}) {
    const { centreId, dateDebut, dateFin } = filters;
    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (centreId) {
      conditions.push('s.centre_id = $' + paramIdx);
      params.push(parseInt(centreId));
      paramIdx++;
    }
    if (dateDebut) {
      conditions.push('s.date_session >= $' + paramIdx);
      params.push(dateDebut);
      paramIdx++;
    }
    if (dateFin) {
      conditions.push('s.date_session <= $' + paramIdx);
      params.push(dateFin);
      paramIdx++;
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    switch (type) {
      case 'vaccinations':
        const vaccRes = await pool.query(`
          SELECT
            vac.date_heure AS date_vaccination,
            b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.date_naissance,
            v.nom AS vaccin_nom,
            p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone,
            per.nom AS personnel_nom, per.prenom AS personnel_prenom,
            c.nom AS centre_nom,
            vac.poids, vac.taille, vac.reactions
          FROM vaccination vac
          JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
          JOIN session s ON s.id = rdv.session_id
          JOIN bebe b ON b.id = rdv.bebe_id
          JOIN vaccin v ON v.id = s.vaccin_id
          JOIN parent p ON p.id = rdv.parent_id
          JOIN personnel per ON per.id = vac.personnel_id
          JOIN centre c ON c.id = s.centre_id
          ${where}
          ORDER BY vac.date_heure DESC
          LIMIT 1000
        `, params);
        return { type, data: vaccRes.rows, count: vaccRes.rows.length };

      case 'absenteisme':
        const absRes = await pool.query(`
          SELECT
            s.date_session, s.heure_debut,
            v.nom AS vaccin_nom, c.nom AS centre_nom,
            p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone,
            b.prenom AS bebe_prenom, b.nom AS bebe_nom,
            rdv.statut
          FROM rendez_vous rdv
          JOIN session s ON s.id = rdv.session_id
          JOIN vaccin v ON v.id = s.vaccin_id
          JOIN centre c ON c.id = s.centre_id
          JOIN parent p ON p.id = rdv.parent_id
          JOIN bebe b ON b.id = rdv.bebe_id
          ${where}
          ORDER BY s.date_session DESC
          LIMIT 1000
        `, params);
        return { type, data: absRes.rows, count: absRes.rows.length };

      case 'sessions':
        const sessRes = await pool.query(`
          SELECT
            s.date_session, s.heure_debut, s.heure_fin, s.statut,
            s.max_inscriptions,
            v.nom AS vaccin_nom, c.nom AS centre_nom,
            COUNT(rdv.id) AS nb_inscrits
          FROM session s
          JOIN vaccin v ON v.id = s.vaccin_id
          JOIN centre c ON c.id = s.centre_id
          LEFT JOIN rendez_vous rdv ON rdv.session_id = s.id
          ${where}
          GROUP BY s.id, s.date_session, s.heure_debut, s.heure_fin, s.statut,
                  s.max_inscriptions, v.nom, c.nom
          ORDER BY s.date_session DESC
          LIMIT 1000
        `, params);
        return { type, data: sessRes.rows, count: sessRes.rows.length };

      case 'stock':
        const stockRes = await pool.query(`
          SELECT
            c.nom AS centre_nom, v.nom AS vaccin_nom,
            st.quantite_disponible, st.seuil_alerte,
            CASE WHEN st.quantite_disponible <= st.seuil_alerte THEN 'ALERTE' ELSE 'OK' END AS statut
          FROM stock st
          JOIN centre c ON c.id = st.centre_id
          JOIN vaccin v ON v.id = st.vaccin_id
          ${centreId ? 'WHERE st.centre_id = ' + parseInt(centreId) : ''}
          ORDER BY st.quantite_disponible ASC
        `);
        return { type, data: stockRes.rows, count: stockRes.rows.length };

      default:
        return { type, data: [], count: 0, error: 'Type non supporte. Utilisez: vaccinations, absenteisme, sessions, stock' };
    }
  }
}

module.exports = new StatsService();
