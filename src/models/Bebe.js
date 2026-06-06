const { query } = require('../config/database');

const Bebe = {
  async create(data) {
    const { parent_id, prenom, nom, date_naissance, sexe, photo_url } = data;
    const code_qr = `VK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await query(
      `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, photo_url, code_qr)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parent_id, prenom, nom, date_naissance, sexe, photo_url, code_qr],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query('SELECT * FROM bebe WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByQRCode(codeQr) {
    const result = await query('SELECT * FROM bebe WHERE code_qr = $1', [codeQr]);
    return result.rows[0];
  },

  async findByParent(parentId) {
    const result = await query('SELECT * FROM bebe WHERE parent_id = $1 ORDER BY date_naissance', [
      parentId,
    ]);
    return result.rows;
  },

  async findDuplicate(parentId, data) {
    const result = await query(
      `SELECT id FROM bebe
       WHERE parent_id = $1
         AND LOWER(prenom) = LOWER($2)
         AND LOWER(nom) = LOWER($3)
         AND date_naissance = $4
       LIMIT 1`,
      [parentId, data.prenom, data.nom, data.date_naissance],
    );
    return result.rows[0] || null;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['prenom', 'nom', 'date_naissance', 'sexe', 'photo_url'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE bebe SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  async getVaccineHistory(bebeId) {
    const result = await query(
      `SELECT v.id AS vaccination_id, v.date_heure, v.poids, v.taille, v.reactions,
              vc.nom AS vaccin_nom, f.numero_lot, f.fabricant,
              p.nom AS infirmier_nom, p.prenom AS infirmier_prenom
       FROM vaccination v
       JOIN rendez_vous rdv ON rdv.id = v.rendez_vous_id
       JOIN session s ON s.id = rdv.session_id
       JOIN vaccin vc ON vc.id = s.vaccin_id
       LEFT JOIN flacon f ON f.id = v.flacon_id
       JOIN personnel p ON p.id = v.personnel_id
       WHERE rdv.bebe_id = $1 ORDER BY v.date_heure DESC`,
      [bebeId],
    );
    return result.rows;
  },

  async getGrowthHistory(bebeId) {
    const result = await query('SELECT * FROM croissance WHERE bebe_id = $1 ORDER BY date_mesure', [
      bebeId,
    ]);
    return result.rows;
  },

  async getDelayedVaccines(bebeId) {
    const result = await query(
      `SELECT vc.nom AS vaccin_nom, vc.age_cible_semaines,
              b.date_naissance,
              (CURRENT_DATE - b.date_naissance) / 7 AS age_actuel_semaines
       FROM vaccin vc CROSS JOIN bebe b
       WHERE b.id = $1 AND vc.est_actif = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM vaccination vac
           JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
           JOIN session s ON s.id = rdv.session_id
           WHERE rdv.bebe_id = b.id AND s.vaccin_id = vc.id
         )
         AND (CURRENT_DATE - b.date_naissance) / 7 > vc.age_cible_semaines + 1
       ORDER BY vc.age_cible_semaines`,
      [bebeId],
    );
    return result.rows;
  },
};

module.exports = Bebe;
