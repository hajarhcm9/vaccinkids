const { query } = require('../config/database');
const ApiError = require('../utils/ApiError');

const RendezVous = {
  async create(data) {
    const { session_id, parent_id, bebe_id, statut = 'EN_ATTENTE' } = data;
    try {
      const result = await query(
        'INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut) VALUES ($1, $2, $3, $4) RETURNING *',
        [session_id, parent_id, bebe_id, statut],
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw ApiError.conflict('Ce bébé est déjà inscrit à cette session');
      }
      throw error;
    }
  },

  async findById(id) {
    const result = await query(
      'SELECT rdv.*, s.centre_id, s.date_session, s.heure_debut, s.heure_fin, s.statut AS session_statut, ' +
        'v.nom AS vaccin_nom, c.nom AS centre_nom, ' +
        'b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.numero_centre AS bebe_numero_centre ' +
        'FROM rendez_vous rdv ' +
        'JOIN session s ON s.id = rdv.session_id ' +
        'JOIN vaccin v ON v.id = s.vaccin_id ' +
        'JOIN centre c ON c.id = s.centre_id ' +
        'JOIN bebe b ON b.id = rdv.bebe_id ' +
        'WHERE rdv.id = $1',
      [id],
    );
    return result.rows[0];
  },

  async findByParent(parentId) {
    const result = await query(
      'SELECT rdv.*, s.centre_id, s.date_session, s.heure_debut, s.heure_fin, s.statut AS session_statut, ' +
        's.vaccin_id, ' +
        'v.nom AS vaccin_nom, c.nom AS centre_nom, c.adresse AS centre_adresse, ' +
        'c.gps_lat AS centre_gps_lat, c.gps_lng AS centre_gps_lng, ' +
        'b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.numero_centre AS bebe_numero_centre ' +
        'FROM rendez_vous rdv ' +
        'JOIN session s ON s.id = rdv.session_id ' +
        'JOIN vaccin v ON v.id = s.vaccin_id ' +
        'JOIN centre c ON c.id = s.centre_id ' +
        'JOIN bebe b ON b.id = rdv.bebe_id ' +
        'WHERE rdv.parent_id = $1 ORDER BY s.date_session DESC',
      [parentId],
    );
    return result.rows;
  },

  async findBySession(sessionId) {
    const result = await query(
      'SELECT rdv.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, ' +
        'b.numero_centre AS bebe_numero_centre, b.date_naissance AS bebe_date_naissance, b.sexe AS bebe_sexe, b.code_qr AS bebe_code_qr, ' +
        'p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone, ' +
        's.heure_debut, v.nom AS vaccin_nom ' +
        'FROM rendez_vous rdv ' +
        'JOIN bebe b ON b.id = rdv.bebe_id ' +
        'JOIN parent p ON p.id = rdv.parent_id ' +
        'JOIN session s ON s.id = rdv.session_id ' +
        'JOIN vaccin v ON v.id = s.vaccin_id ' +
        'WHERE rdv.session_id = $1 ORDER BY rdv.date_creation',
      [sessionId],
    );
    return result.rows;
  },

  async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.statut) {
      values.push(filters.statut);
      conditions.push('rdv.statut = $' + idx++);
    }
    if (filters.sessionId) {
      values.push(filters.sessionId);
      conditions.push('rdv.session_id = $' + idx++);
    }
    if (filters.parentId) {
      values.push(filters.parentId);
      conditions.push('rdv.parent_id = $' + idx++);
    }
    if (filters.bebeId) {
      values.push(filters.bebeId);
      conditions.push('rdv.bebe_id = $' + idx++);
    }
    if (filters.centreId) {
      values.push(filters.centreId);
      conditions.push('s.centre_id = $' + idx++);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const result = await query(
      'SELECT rdv.*, s.centre_id, s.date_session, s.heure_debut, s.heure_fin, s.statut AS session_statut, ' +
        'v.nom AS vaccin_nom, c.nom AS centre_nom, c.adresse AS centre_adresse, ' +
        'c.gps_lat AS centre_gps_lat, c.gps_lng AS centre_gps_lng, ' +
        'b.prenom AS bebe_prenom, b.nom AS bebe_nom, b.date_naissance AS bebe_date_naissance, b.sexe AS bebe_sexe, b.code_qr AS bebe_code_qr, ' +
        's.vaccin_id, ' +
        'p.nom AS parent_nom, p.prenom AS parent_prenom, p.telephone AS parent_telephone ' +
        'FROM rendez_vous rdv ' +
        'JOIN session s ON s.id = rdv.session_id ' +
        'JOIN vaccin v ON v.id = s.vaccin_id ' +
        'JOIN centre c ON c.id = s.centre_id ' +
        'JOIN bebe b ON b.id = rdv.bebe_id ' +
        'JOIN parent p ON p.id = rdv.parent_id' +
        whereClause +
        ' ORDER BY s.date_session DESC, rdv.date_creation DESC',
      values,
    );
    return result.rows;
  },

  async updateStatus(id, statut) {
    const result = await query('UPDATE rendez_vous SET statut = $1 WHERE id = $2 RETURNING *', [
      statut,
      id,
    ]);
    return result.rows[0];
  },

  async countBySession(sessionId) {
    const result = await query(
      'SELECT COUNT(*) AS total, ' +
        "COUNT(*) FILTER (WHERE statut NOT IN ('ANNULE', 'EN_LISTE_ATTENTE')) AS actifs, " +
        "COUNT(*) FILTER (WHERE statut = 'EN_ATTENTE') AS en_attente, " +
        "COUNT(*) FILTER (WHERE statut = 'CONFIRME') AS confirmes, " +
        "COUNT(*) FILTER (WHERE statut = 'PRESENT') AS presents, " +
        "COUNT(*) FILTER (WHERE statut = 'ABSENT') AS absents, " +
        "COUNT(*) FILTER (WHERE statut = 'EN_LISTE_ATTENTE') AS en_liste_attente " +
        'FROM rendez_vous WHERE session_id = $1',
      [sessionId],
    );
    return result.rows[0];
  },

  async countActiveBySession(sessionId) {
    const counts = await this.countBySession(sessionId);
    return parseInt(counts.actifs);
  },

  async markAbsentBySession(sessionId) {
    const result = await query(
      "UPDATE rendez_vous SET statut = 'ABSENT' WHERE session_id = $1 AND statut IN ('EN_ATTENTE', 'CONFIRME', 'EN_LISTE_ATTENTE') RETURNING *",
      [sessionId],
    );
    return result.rows;
  },

  async existsBySessionAndBebe(sessionId, bebeId) {
    const result = await query(
      "SELECT id FROM rendez_vous WHERE session_id = $1 AND bebe_id = $2 AND statut != 'ANNULE'",
      [sessionId, bebeId],
    );
    return result.rows.length > 0;
  },

  async getNextQueueNumber(sessionId) {
    const result = await query(
      'SELECT COALESCE(MAX(numero_attente), 0) + 1 AS next_number FROM rendez_vous WHERE session_id = $1',
      [sessionId],
    );
    return result.rows[0].next_number;
  },

  async assignQueueNumber(id, numero) {
    const result = await query(
      'UPDATE rendez_vous SET numero_attente = $1 WHERE id = $2 RETURNING *',
      [numero, id],
    );
    return result.rows[0];
  },
};

module.exports = RendezVous;
