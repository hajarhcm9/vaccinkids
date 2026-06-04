const { pool } = require('../config/database');

class Recherche {
  static async searchGlobal(query, userId, role) {
    const results = {};
    const term = `%${query}%`;

    if (role === 'admin') {
      const bebes = await pool.query(
        `SELECT b.id, b.nom, b.prenom, b.date_naissance, p.nom AS parent_nom, p.prenom AS parent_prenom
         FROM bebe b LEFT JOIN parent p ON b.parent_id = p.id
         WHERE b.nom ILIKE $1 OR b.prenom ILIKE $1`,
        [term],
      );
      results.bebes = bebes.rows;

      const parents = await pool.query(
        `SELECT id, nom, prenom, telephone FROM parent
         WHERE nom ILIKE $1 OR prenom ILIKE $1 OR telephone ILIKE $1`,
        [term],
      );
      results.parents = parents.rows;

      const centres = await pool.query(
        `SELECT id, nom, adresse FROM centre WHERE nom ILIKE $1 OR adresse ILIKE $1`,
        [term],
      );
      results.centres = centres.rows;

      const vaccins = await pool.query(`SELECT id, nom FROM vaccin WHERE nom ILIKE $1`, [term]);
      results.vaccins = vaccins.rows;
    } else {
      const bebes = await pool.query(
        `SELECT b.id, b.nom, b.prenom, b.date_naissance
         FROM bebe b
         JOIN rendez_vous rv ON rv.bebe_id = b.id
         JOIN session s ON s.id = rv.session_id
         WHERE s.centre_id = $1 AND (b.nom ILIKE $2 OR b.prenom ILIKE $2)`,
        [userId, term],
      );
      results.bebes = bebes.rows;
    }

    return results;
  }

  static async searchRendezVous(filters) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.statut) {
      conditions.push(`rv.statut = $${idx++}`);
      params.push(filters.statut);
    }
    if (filters.centre_id) {
      conditions.push(`s.centre_id = $${idx++}`);
      params.push(filters.centre_id);
    }
    if (filters.date_debut) {
      conditions.push(`s.date_session >= $${idx++}`);
      params.push(filters.date_debut);
    }
    if (filters.date_fin) {
      conditions.push(`s.date_session <= $${idx++}`);
      params.push(filters.date_fin);
    }
    if (filters.bebe_id) {
      conditions.push(`rv.bebe_id = $${idx++}`);
      params.push(filters.bebe_id);
    }
    if (filters.parent_id) {
      conditions.push(`rv.parent_id = $${idx++}`);
      params.push(filters.parent_id);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT rv.*, s.date_session, s.heure_debut, s.heure_fin, s.centre_id,
              b.nom AS bebe_nom, b.prenom AS bebe_prenom,
              p.nom AS parent_nom, p.prenom AS parent_prenom
       FROM rendez_vous rv
       JOIN session s ON s.id = rv.session_id
       JOIN bebe b ON b.id = rv.bebe_id
       JOIN parent p ON p.id = rv.parent_id
       ${where}
       ORDER BY s.date_session DESC, s.heure_debut ASC
       LIMIT 50`,
      params,
    );
    return rows;
  }

  static async searchVaccinations(filters) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.centre_id) {
      conditions.push(`s.centre_id = $${idx++}`);
      params.push(filters.centre_id);
    }
    if (filters.date_debut) {
      conditions.push(`v.date_heure >= $${idx++}`);
      params.push(filters.date_debut);
    }
    if (filters.date_fin) {
      conditions.push(`v.date_heure <= $${idx++}`);
      params.push(filters.date_fin);
    }
    if (filters.vaccin_id) {
      conditions.push(`vc.id = $${idx++}`);
      params.push(filters.vaccin_id);
    }
    if (filters.bebe_id) {
      conditions.push(`rv.bebe_id = $${idx++}`);
      params.push(filters.bebe_id);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT v.id, v.date_heure, v.poids, v.taille, v.reactions,
              vc.nom AS vaccin_nom, b.nom AS bebe_nom, b.prenom AS bebe_prenom,
              s.centre_id
       FROM vaccination v
       JOIN rendez_vous rv ON rv.id = v.rendez_vous_id
       JOIN session s ON s.id = rv.session_id
       JOIN flacon f ON f.id = v.flacon_id
       JOIN vaccin vc ON vc.id = f.vaccin_id
       JOIN bebe b ON b.id = rv.bebe_id
       ${where}
       ORDER BY v.date_heure DESC
       LIMIT 50`,
      params,
    );
    return rows;
  }

  static async searchSessions(filters) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (filters.centre_id) {
      conditions.push(`s.centre_id = $${idx++}`);
      params.push(filters.centre_id);
    }
    if (filters.vaccin_id) {
      conditions.push(`s.vaccin_id = $${idx++}`);
      params.push(filters.vaccin_id);
    }
    if (filters.statut) {
      conditions.push(`s.statut = $${idx++}`);
      params.push(filters.statut);
    }
    if (filters.date_debut) {
      conditions.push(`s.date_session >= $${idx++}`);
      params.push(filters.date_debut);
    }
    if (filters.date_fin) {
      conditions.push(`s.date_session <= $${idx++}`);
      params.push(filters.date_fin);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT s.*, c.nom AS centre_nom, vc.nom AS vaccin_nom,
              (SELECT COUNT(*)::int FROM rendez_vous rv WHERE rv.session_id = s.id) AS nb_rdv
       FROM session s
       JOIN centre c ON c.id = s.centre_id
       JOIN vaccin vc ON vc.id = s.vaccin_id
       ${where}
       ORDER BY s.date_session DESC, s.heure_debut ASC
       LIMIT 50`,
      params,
    );
    return rows;
  }
}

module.exports = Recherche;
