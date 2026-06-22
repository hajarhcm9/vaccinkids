const { query } = require('../config/database');

const Vaccination = {
  async create(data) {
    const { rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions } = data;
    const result = await query(
      'INSERT INTO vaccination (rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        rendez_vous_id,
        personnel_id,
        flacon_id || null,
        poids || null,
        taille || null,
        reactions || null,
      ],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM vaccination WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByRendezVous(rdvId) {
    const result = await query('SELECT * FROM vaccination WHERE rendez_vous_id = $1', [rdvId]);
    return result.rows[0];
  },

  async findByRdv(rdvId) {
    return this.findByRendezVous(rdvId);
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT vac.*, rdv.bebe_id, rdv.statut AS rdv_statut, ' +
        'b.prenom AS bebe_prenom, b.nom AS bebe_nom, ' +
        'p.nom AS personnel_nom, p.prenom AS personnel_prenom, ' +
        'f.numero_lot, f.fabricant ' +
        'FROM vaccination vac ' +
        'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
        'JOIN bebe b ON b.id = rdv.bebe_id ' +
        'JOIN personnel p ON p.id = vac.personnel_id ' +
        'LEFT JOIN flacon f ON f.id = vac.flacon_id ' +
        'WHERE rdv.session_id = $1 ORDER BY vac.date_heure',
      [sessionId],
    );
    return result.rows;
  },

  async findByBebe(bebeId) {
    const result = await query(
      'SELECT vac.*, s.date_session, s.vaccin_id, v.nom AS vaccin_nom, v.maladies_ciblees, ' +
        'f.numero_lot, f.fabricant, ' +
        'p.nom AS personnel_nom, p.prenom AS personnel_prenom ' +
        'FROM vaccination vac ' +
        'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
        'JOIN session s ON s.id = rdv.session_id ' +
        'JOIN vaccin v ON v.id = s.vaccin_id ' +
        'LEFT JOIN flacon f ON f.id = vac.flacon_id ' +
        'JOIN personnel p ON p.id = vac.personnel_id ' +
        'WHERE rdv.bebe_id = $1 ORDER BY s.date_session DESC',
      [bebeId],
    );
    return result.rows;
  },

  async countBySession(sessionId) {
    const result = await query(
      'SELECT COUNT(*) AS total FROM vaccination vac ' +
        'JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id ' +
        'WHERE rdv.session_id = $1',
      [sessionId],
    );
    return parseInt(result.rows[0].total);
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
