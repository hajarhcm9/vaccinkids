const { pool } = require('../config/database');

class Statistique {
  static async getDashboardGlobal() {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM centre WHERE est_actif = true) AS centres_actifs,
        (SELECT COUNT(*)::int FROM personnel) AS total_personnel,
        (SELECT COUNT(*)::int FROM parent) AS total_parents,
        (SELECT COUNT(*)::int FROM bebe) AS total_bebes,
        (SELECT COUNT(*)::int FROM session WHERE date_session >= CURRENT_DATE) AS sessions_a_venir,
        (SELECT COUNT(*)::int FROM rendez_vous WHERE statut = 'EN_ATTENTE') AS rdv_en_attente,
        (SELECT COUNT(*)::int FROM rendez_vous WHERE statut = 'CONFIRME') AS rdv_confirmes,
        (SELECT COUNT(*)::int FROM vaccination) AS total_vaccinations,
        (SELECT COUNT(*)::int FROM stock WHERE quantite_disponible <= seuil_alerte) AS alertes_stock
    `);
    return rows[0];
  }

  static async getDashboardCentre(centreId) {
    const { rows } = await pool.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM session WHERE centre_id = $1 AND date_session >= CURRENT_DATE) AS sessions_a_venir,
        (SELECT COUNT(*)::int FROM rendez_vous rv JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $1 AND rv.statut = 'EN_ATTENTE') AS rdv_en_attente,
        (SELECT COUNT(*)::int FROM rendez_vous rv JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $1 AND rv.statut = 'CONFIRME') AS rdv_confirmes,
        (SELECT COUNT(*)::int FROM vaccination v JOIN rendez_vous rv ON rv.id = v.rendez_vous_id JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $1) AS total_vaccinations,
        (SELECT COUNT(*)::int FROM stock WHERE centre_id = $1 AND quantite_disponible <= seuil_alerte) AS alertes_stock
    `,
      [centreId],
    );
    return rows[0];
  }

  static async getVaccinationsMensuelles(annee) {
    const year = annee || new Date().getFullYear();
    const { rows } = await pool.query(
      `
      SELECT TO_CHAR(v.date_heure, 'YYYY-MM') AS mois, COUNT(*)::int AS nombre
      FROM vaccination v
      WHERE EXTRACT(YEAR FROM v.date_heure) = $1
      GROUP BY TO_CHAR(v.date_heure, 'YYYY-MM')
      ORDER BY mois
    `,
      [year],
    );
    return rows;
  }

  static async getRdvParStatut(centreId) {
    let query = `SELECT rv.statut, COUNT(*)::int AS nombre FROM rendez_vous rv`;
    const params = [];
    if (centreId) {
      query += ` JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $1`;
      params.push(centreId);
    }
    query += ` GROUP BY rv.statut ORDER BY rv.statut`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getStockAlertes(centreId) {
    let query = `
      SELECT s.centre_id, c.nom AS centre_nom, v.nom AS vaccin_nom,
             s.quantite_disponible, s.seuil_alerte
      FROM stock s
      JOIN centre c ON c.id = s.centre_id
      JOIN vaccin v ON v.id = s.vaccin_id
      WHERE s.quantite_disponible <= s.seuil_alerte
    `;
    const params = [];
    if (centreId) {
      query += ` AND s.centre_id = $1`;
      params.push(centreId);
    }
    query += ` ORDER BY s.quantite_disponible ASC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async getTopVaccins(centreId) {
    const params = [];
    let query = `
      SELECT vc.nom AS vaccin_nom, COUNT(vac.id)::int AS nombre_vaccinations
      FROM vaccin vc
      LEFT JOIN session s ON s.vaccin_id = vc.id
      LEFT JOIN rendez_vous rv ON rv.session_id = s.id
      LEFT JOIN vaccination vac ON vac.rendez_vous_id = rv.id
    `;
    if (centreId) {
      params.push(centreId);
      query += ` WHERE s.centre_id = $1`;
    }
    query += `
      GROUP BY vc.nom
      ORDER BY nombre_vaccinations DESC LIMIT 10
    `;
    const { rows } = await pool.query(query, params);
    return rows;
  }
}

module.exports = Statistique;
