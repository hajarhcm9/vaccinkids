'use strict';

const { pool } = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { isValidMoroccanPhone, normalizePhone } = require('../utils/validator');
const { success, created } = require('../utils/responseHandler');
const { createQrCode } = require('../utils/qrCode');

function normalizeDate(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  return null;
}

const GuestRdvController = {
  listPublicCentres: catchAsync(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, nom, adresse, telephone, gps_lat, gps_lng
       FROM centre
       WHERE est_actif = TRUE
       ORDER BY nom ASC`,
    );
    return success(res, 200, 'Centres disponibles', rows);
  }),

  listPublicSessions: catchAsync(async (req, res) => {
    const newbornOnly = req.query.newborn === 'true';
    const centreId    = req.query.centre_id ? parseInt(req.query.centre_id, 10) : null;

    const values = [];
    const extra  = [];
    if (newbornOnly) extra.push('AND v.est_naissance = TRUE');
    if (centreId)   { values.push(centreId); extra.push(`AND s.centre_id = $${values.length}`); }

    const { rows } = await pool.query(`
      SELECT s.id, s.date_session, s.heure_debut, s.heure_fin,
             s.max_inscriptions,
             COALESCE(COUNT(r.id) FILTER (WHERE r.statut NOT IN ('ANNULE')), 0)::int AS inscrits,
             s.max_inscriptions - COALESCE(COUNT(r.id) FILTER (WHERE r.statut NOT IN ('ANNULE')), 0)::int AS places_restantes,
             v.nom AS vaccin_nom, v.est_naissance,
             c.nom AS centre_nom, c.adresse AS centre_adresse
      FROM session s
      JOIN vaccin v ON v.id = s.vaccin_id
      JOIN centre c ON c.id = s.centre_id
      LEFT JOIN rendez_vous r ON r.session_id = s.id
      WHERE s.statut IN ('EN_FORMATION', 'PLANIFIEE', 'CONFIRMEE')
        AND s.date_session >= CURRENT_DATE
        AND c.est_actif = TRUE
        AND v.est_actif = TRUE
        ${extra.join(' ')}
      GROUP BY s.id, v.nom, v.est_naissance, c.nom, c.adresse
      ORDER BY s.date_session ASC, s.heure_debut ASC
    `, values);
    return success(res, 200, 'Sessions disponibles', rows);
  }),

  createGuestRdv: catchAsync(async (req, res, next) => {
    const { nom_parent, telephone, prenom_bebe, nom_bebe, date_naissance_bebe, sexe_bebe, session_id, is_newborn } = req.body;
    const newborn = is_newborn === true || is_newborn === 'true';

    if (!nom_parent || !telephone || !session_id)
      return next(ApiError.badRequest('Tous les champs obligatoires doivent être remplis'));
    if (!newborn && !prenom_bebe)
      return next(ApiError.badRequest('Prénom de l\'enfant requis'));

    const phone = normalizePhone(telephone);
    if (!isValidMoroccanPhone(phone))
      return next(ApiError.badRequest('Numéro de téléphone invalide'));

    const dobRaw = newborn
      ? new Date().toISOString().split('T')[0]
      : date_naissance_bebe;
    const dob = normalizeDate(dobRaw);
    if (!dob) return next(ApiError.badRequest('Date de naissance invalide (JJ/MM/AAAA)'));
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime()) || dobDate > new Date())
      return next(ApiError.badRequest('Date de naissance invalide ou dans le futur'));

    const sessionRes = await pool.query(
      `SELECT s.*, v.nom AS vaccin_nom, c.nom AS centre_nom, c.id AS centre_id,
              s.max_inscriptions - COALESCE(
                (SELECT COUNT(*) FROM rendez_vous r WHERE r.session_id = s.id AND r.statut NOT IN ('ANNULE')), 0
              ) AS places_restantes
       FROM session s
       JOIN vaccin v ON v.id = s.vaccin_id
       JOIN centre c ON c.id = s.centre_id
       WHERE s.id = $1 AND s.statut IN ('EN_FORMATION','PLANIFIEE','CONFIRMEE') AND s.date_session >= CURRENT_DATE`,
      [session_id],
    );
    if (!sessionRes.rows.length)
      return next(ApiError.notFound('Session introuvable ou non disponible'));

    const session = sessionRes.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const parentRes = await client.query(
        `INSERT INTO parent (telephone, nom, prenom, is_new_user, langue_preferee)
         VALUES ($1, $2, 'Guest', FALSE, 'fr')
         ON CONFLICT (telephone) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [phone, nom_parent.trim()],
      );
      const parent = parentRes.rows[0];

      const finalPrenom = newborn ? (prenom_bebe?.trim() || 'Nouveau-né') : prenom_bebe.trim();
      const finalNom    = newborn ? (nom_bebe?.trim() || nom_parent.trim()) : (nom_bebe || nom_parent).trim();

      // Atomic counter increment → numero_centre
      const counterRes = await client.query(
        `UPDATE centre SET bebe_counter = bebe_counter + 1 WHERE id = $1 RETURNING bebe_counter`,
        [session.centre_id],
      );
      const numero_centre = counterRes.rows[0]?.bebe_counter ?? null;

      const bebeRes = await client.query(
        `INSERT INTO bebe (parent_id, prenom, nom, date_naissance, sexe, is_newborn, centre_id, numero_centre, code_qr)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [parent.id, finalPrenom, finalNom, dob, sexe_bebe || 'M', newborn, session.centre_id, numero_centre, createQrCode()],
      );
      const bebe = bebeRes.rows[0];

      const isFull = Number(session.places_restantes) <= 0;
      const rdvStatut = isFull ? 'EN_LISTE_ATTENTE' : 'EN_ATTENTE';

      const rdvRes = await client.query(
        `INSERT INTO rendez_vous (parent_id, bebe_id, session_id, statut)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [parent.id, bebe.id, session_id, rdvStatut],
      );
      const rdv = rdvRes.rows[0];

      // Auto-confirm when this was the last available spot
      let sessionConfirmed = false;
      if (!isFull && Number(session.places_restantes) === 1 && session.statut === 'EN_FORMATION') {
        await client.query(
          "UPDATE session SET statut = 'CONFIRMEE', updated_at = NOW() WHERE id = $1",
          [session_id],
        );
        sessionConfirmed = true;
      }

      await client.query('COMMIT');

      if (sessionConfirmed) {
        const ns = require('../services/notificationService');
        ns.sendSessionConfirmee(session_id, { pool }).catch(() => {});
      }

      return created(res, isFull ? 'Vous avez été ajouté à la liste d\'attente' : 'Rendez-vous confirmé', {
        rdv: {
          id: rdv.id,
          statut: rdvStatut,
          vaccin_nom: session.vaccin_nom,
          date_session: session.date_session,
          heure_debut: session.heure_debut,
          heure_fin: session.heure_fin,
          centre_nom: session.centre_nom,
          centre_adresse: session.centre_adresse,
          bebe_prenom: bebe.prenom,
          bebe_nom: bebe.nom,
          bebe_id: bebe.id,
          bebe_numero_centre: bebe.numero_centre,
          en_attente: isFull,
        },
        message: isFull
          ? `La session est complète. Vous êtes en liste d'attente. Le centre vous contactera au ${phone}.`
          : `RDV confirmé. Le centre vous contactera au ${phone} pour rappel.`,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }),
};

module.exports = GuestRdvController;
