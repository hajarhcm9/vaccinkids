const { query } = require('../config/database');

const Vaccination = {
  async create(data) {
    const { rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions } = data;
    const result = await query(
      `INSERT INTO vaccination (rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM vaccination WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByRdv(rendez_vous_id) {
    const result = await query('SELECT * FROM vaccination WHERE rendez_vous_id = $1', [
      rendez_vous_id,
    ]);
    return result.rows[0];
  },

  async findByBebe(bebeId, startDate, endDate) {
    const result = await query(
      `SELECT v.*, rdv.statut as rdv_statut, s.date_session, vc.nom as vaccin_nom
       FROM vaccination v
       JOIN rendez_vous rdv ON rdv.id = v.rendez_vous_id
       JOIN session s ON s.id = rdv.session_id
       JOIN vaccin vc ON vc.id = s.vaccin_id
       WHERE rdv.bebe_id = $1 AND v.date_heure BETWEEN $2 AND $3 ORDER BY v.date_heure DESC`,
      [bebeId, startDate, endDate],
    );
    return result.rows;
  },

  async updateFlacon(id, flacon_id) {
    const result = await query('UPDATE vaccination SET flacon_id = $1 WHERE id = $2 RETURNING *', [
      flacon_id,
      id,
    ]);
    return result.rows[0];
  },
};

module.exports = Vaccination;
