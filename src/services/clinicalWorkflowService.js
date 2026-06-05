const { getClient } = require('../config/database');
const ApiError = require('../utils/ApiError');
const authorization = require('./resourceAuthorizationService');

const recordVaccination = async ({ user, rdvId, flaconId, poids, taille, reactions }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const rdvResult = await client.query(
      `SELECT rdv.*, s.centre_id, s.statut AS session_statut, s.vaccin_id
       FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id
       WHERE rdv.id = $1 FOR UPDATE OF rdv, s`,
      [rdvId],
    );
    const rdv = rdvResult.rows[0];
    if (!rdv) throw ApiError.notFound('Appointment not found');
    if (user.role === 'infirmier') authorization.assertCentreAccess(user, rdv.centre_id);
    if (rdv.session_statut !== 'EN_COURS') {
      throw ApiError.badRequest('Session must be in progress to record vaccinations');
    }
    if (!['CONFIRME', 'PRESENT'].includes(rdv.statut)) {
      throw ApiError.badRequest('Appointment must be confirmed before vaccination');
    }
    if (!flaconId) {
      throw ApiError.badRequest('Vial is required to record vaccination');
    }

    const existing = await client.query('SELECT id FROM vaccination WHERE rendez_vous_id = $1', [
      rdvId,
    ]);
    if (existing.rows[0]) throw ApiError.conflict('Vaccination already recorded');

    const vialResult = await client.query(
      `SELECT f.*, v.doses_par_flacon FROM flacon f
       JOIN vaccin v ON v.id = f.vaccin_id WHERE f.id = $1 FOR UPDATE OF f`,
      [flaconId],
    );
    const vial = vialResult.rows[0];
    if (!vial) throw ApiError.notFound('Vial not found');
    if (Number(vial.session_id) !== Number(rdv.session_id)) {
      throw ApiError.badRequest('Vial does not belong to this session');
    }
    if (Number(vial.vaccin_id) !== Number(rdv.vaccin_id)) {
      throw ApiError.badRequest('Vial vaccine does not match the session vaccine');
    }
    if (vial.doses_utilisees + vial.doses_gaspillees >= vial.doses_par_flacon) {
      throw ApiError.conflict('This vial has no remaining doses');
    }

    const vaccination = await client.query(
      `INSERT INTO vaccination
       (rendez_vous_id, personnel_id, flacon_id, poids, taille, reactions)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [rdvId, user.id, flaconId || null, poids || null, taille || null, reactions || null],
    );
    await client.query(
      'UPDATE flacon SET doses_utilisees = doses_utilisees + 1, updated_at = NOW() WHERE id = $1',
      [flaconId],
    );
    await client.query(
      "UPDATE rendez_vous SET statut = 'PRESENT', updated_at = NOW() WHERE id = $1",
      [rdvId],
    );
    await client.query('COMMIT');
    return vaccination.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw ApiError.conflict('Vaccination already recorded');
    throw error;
  } finally {
    client.release();
  }
};

const recordWaste = async ({ user, flaconId, doses = 1 }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const vialResult = await client.query(
      `SELECT f.*, s.centre_id, v.doses_par_flacon
       FROM flacon f LEFT JOIN session s ON s.id = f.session_id
       JOIN vaccin v ON v.id = f.vaccin_id WHERE f.id = $1 FOR UPDATE OF f`,
      [flaconId],
    );
    const vial = vialResult.rows[0];
    if (!vial) throw ApiError.notFound('Vial not found');
    if (user.role === 'infirmier') {
      if (!vial.centre_id) throw ApiError.forbidden('Unassigned vials are restricted to admins');
      authorization.assertCentreAccess(user, vial.centre_id);
    }
    if (vial.doses_utilisees + vial.doses_gaspillees + doses > vial.doses_par_flacon) {
      throw ApiError.conflict('Waste would exceed vial capacity');
    }
    const result = await client.query(
      'UPDATE flacon SET doses_gaspillees = doses_gaspillees + $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [flaconId, doses],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { recordVaccination, recordWaste };
