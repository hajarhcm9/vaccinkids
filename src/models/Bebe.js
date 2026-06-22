const { query, pool } = require('../config/database');
const { createQrCode } = require('../utils/qrCode');

const Bebe = {
  async create(data, clientArg = null) {
    const { parent_id, prenom, nom, date_naissance, sexe, photo_url, is_newborn = false, centre_id } = data;
    const code_qr     = createQrCode();
    const finalPrenom = is_newborn && !prenom ? 'Nouveau-né' : (prenom || 'Nouveau-né');
    const finalNom    = nom || '';

    // If no external client, open our own transaction for the atomic counter increment
    const ownTx = !clientArg;
    const client = clientArg || await pool.connect();
    try {
      if (ownTx) await client.query('BEGIN');

      let numero_centre = null;
      if (centre_id) {
        // Atomically increment the centre's counter and get the new value
        const counterRes = await client.query(
          `UPDATE centre SET bebe_counter = bebe_counter + 1 WHERE id = $1 RETURNING bebe_counter`,
          [centre_id],
        );
        numero_centre = counterRes.rows[0]?.bebe_counter ?? null;
      }

      const result = await client.query(
        `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, photo_url, code_qr, is_newborn, centre_id, numero_centre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [parent_id, finalPrenom, finalNom, date_naissance, sexe, photo_url, code_qr, is_newborn, centre_id || null, numero_centre],
      );

      if (ownTx) await client.query('COMMIT');
      return result.rows[0];
    } catch (e) {
      if (ownTx) await client.query('ROLLBACK');
      throw e;
    } finally {
      if (ownTx) client.release();
    }
  },

  async findById(id) {
    const result = await query(
      `SELECT b.*,
         (SELECT COUNT(*)::integer FROM vaccin
          WHERE est_actif = TRUE
            AND age_cible_semaines <= (CURRENT_DATE - b.date_naissance) / 7
         ) AS vaccins_total,
         (SELECT COUNT(DISTINCT s.vaccin_id)::integer
          FROM vaccination v
          JOIN rendez_vous rdv ON rdv.id = v.rendez_vous_id
          JOIN session s       ON s.id   = rdv.session_id
          WHERE rdv.bebe_id = b.id
         ) AS vaccins_faits
       FROM bebe b
       WHERE b.id = $1`,
      [id],
    );
    return result.rows[0];
  },

  async findByQRCode(codeQr) {
    const result = await query('SELECT * FROM bebe WHERE code_qr = $1', [codeQr]);
    return result.rows[0];
  },

  async getEligibleAppointmentsAtCentre(bebeId, centreId) {
    const result = await query(
      `SELECT rdv.id, rdv.statut, s.id AS session_id, s.date_session, s.heure_debut,
              s.heure_fin, v.nom AS vaccin_nom
       FROM rendez_vous rdv
       JOIN session s ON s.id = rdv.session_id
       JOIN vaccin v ON v.id = s.vaccin_id
       WHERE rdv.bebe_id = $1
         AND s.centre_id = $2
         AND s.date_session = CURRENT_DATE
         AND s.statut IN ('CONFIRMEE', 'EN_COURS')
         AND rdv.statut IN ('CONFIRME', 'PRESENT')
       ORDER BY s.heure_debut`,
      [bebeId, centreId],
    );
    return result.rows;
  },

  async findByParent(parentId) {
    const result = await query(
      `SELECT b.*,
         (SELECT COUNT(*)::integer FROM vaccin
          WHERE est_actif = TRUE
            AND age_cible_semaines <= (CURRENT_DATE - b.date_naissance) / 7
         ) AS vaccins_total,
         (SELECT COUNT(DISTINCT s.vaccin_id)::integer
          FROM vaccination v
          JOIN rendez_vous rdv ON rdv.id = v.rendez_vous_id
          JOIN session s       ON s.id   = rdv.session_id
          WHERE rdv.bebe_id = b.id
         ) AS vaccins_faits,
         (SELECT COUNT(*)::integer
          FROM vaccin vc
          WHERE vc.est_actif = TRUE
            AND vc.age_cible_semaines <= (CURRENT_DATE - b.date_naissance) / 7
            AND NOT EXISTS (
              SELECT 1 FROM vaccination v2
              JOIN rendez_vous rdv2 ON rdv2.id = v2.rendez_vous_id
              JOIN session s2       ON s2.id   = rdv2.session_id
              WHERE rdv2.bebe_id = b.id AND s2.vaccin_id = vc.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM rendez_vous rdv3
              JOIN session s3 ON s3.id = rdv3.session_id
              WHERE rdv3.bebe_id = b.id
                AND s3.vaccin_id = vc.id
                AND rdv3.statut IN ('EN_ATTENTE','CONFIRME','EN_LISTE_ATTENTE')
            )
         ) AS vaccins_retard
       FROM bebe b
       WHERE b.parent_id = $1
       ORDER BY b.date_naissance`,
      [parentId],
    );
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
    const allowedFields = ['prenom', 'nom', 'date_naissance', 'sexe', 'photo_url', 'is_newborn'];
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
      `SELECT vc.id AS vaccin_id, vc.nom AS vaccin_nom, vc.age_cible_semaines,
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
