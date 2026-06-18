const { pool } = require('../config/database');
const ApiError = require('../utils/ApiError');

const dbFor = (client) => client || pool;
const sameId = (left, right) => Number(left) === Number(right);

const requireUserCentre = (user) => {
  if (!user.centre_id) throw ApiError.forbidden('No centre assigned to this account');
  return Number(user.centre_id);
};

const assertCentreAccess = (user, centreId) => {
  if (user.role === 'admin') return Number(centreId);
  if (user.role !== 'infirmier' || !sameId(requireUserCentre(user), centreId)) {
    throw ApiError.forbidden('This resource belongs to another centre');
  }
  return Number(centreId);
};

const scopeCentre = (user, requestedCentreId = null) => {
  if (user.role === 'admin') return requestedCentreId ? Number(requestedCentreId) : null;
  const centreId = requireUserCentre(user);
  if (requestedCentreId && !sameId(centreId, requestedCentreId)) {
    throw ApiError.forbidden('This resource belongs to another centre');
  }
  return centreId;
};

const assertSessionAccess = async (user, sessionId, client) => {
  const result = await dbFor(client).query(
    'SELECT id, centre_id, vaccin_id, statut, max_inscriptions FROM session WHERE id = $1',
    [sessionId],
  );
  const session = result.rows[0];
  if (!session) throw ApiError.notFound('Session not found');
  if (user.role !== 'admin') assertCentreAccess(user, session.centre_id);
  return session;
};

const assertRendezVousAccess = async (user, rdvId, client) => {
  const result = await dbFor(client).query(
    `SELECT rdv.*, s.centre_id, s.statut AS session_statut
     FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id
     WHERE rdv.id = $1`,
    [rdvId],
  );
  const rdv = result.rows[0];
  if (!rdv) throw ApiError.notFound('Appointment not found');
  if (user.role === 'parent' && !sameId(rdv.parent_id, user.id)) {
    throw ApiError.forbidden('This appointment belongs to another parent');
  }
  if (user.role === 'infirmier') assertCentreAccess(user, rdv.centre_id);
  return rdv;
};

const assertBebeAccess = async (user, bebeId, client) => {
  const result = await dbFor(client).query('SELECT id, parent_id FROM bebe WHERE id = $1', [
    bebeId,
  ]);
  const bebe = result.rows[0];
  if (!bebe) throw ApiError.notFound('Baby not found');
  if (user.role === 'parent' && !sameId(bebe.parent_id, user.id)) {
    throw ApiError.forbidden('This baby belongs to another parent');
  }
  if (user.role === 'infirmier') {
    const centre = await dbFor(client).query(
      `SELECT 1 FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id
       WHERE rdv.bebe_id = $1 AND s.centre_id = $2
         AND s.date_session <= CURRENT_DATE
       LIMIT 1`,
      [bebeId, requireUserCentre(user)],
    );
    if (!centre.rows[0]) throw ApiError.forbidden('This baby has no appointment at your centre');
  }
  return bebe;
};

const assertParentAccess = async (user, parentId, client) => {
  if (user.role === 'admin') return Number(parentId);
  if (user.role === 'parent') {
    if (!sameId(user.id, parentId)) throw ApiError.forbidden('This parent record is not yours');
    return Number(parentId);
  }
  const result = await dbFor(client).query(
    `SELECT 1 FROM rendez_vous rdv JOIN session s ON s.id = rdv.session_id
     WHERE rdv.parent_id = $1 AND s.centre_id = $2 LIMIT 1`,
    [parentId, requireUserCentre(user)],
  );
  if (!result.rows[0]) throw ApiError.forbidden('This parent has no record in your centre');
  return Number(parentId);
};

const assertFlaconAccess = async (user, flaconId, client) => {
  const result = await dbFor(client).query(
    `SELECT f.*, s.centre_id, v.doses_par_flacon
     FROM flacon f
     LEFT JOIN session s ON s.id = f.session_id
     JOIN vaccin v ON v.id = f.vaccin_id
     WHERE f.id = $1`,
    [flaconId],
  );
  const flacon = result.rows[0];
  if (!flacon) throw ApiError.notFound('Vial not found');
  if (user.role === 'infirmier') {
    if (!flacon.centre_id) throw ApiError.forbidden('Unassigned vials are restricted to admins');
    assertCentreAccess(user, flacon.centre_id);
  }
  return flacon;
};

const assertVaccinationAccess = async (user, vaccinationId, client) => {
  const result = await dbFor(client).query(
    `SELECT vac.*, rdv.parent_id, rdv.bebe_id, s.centre_id
     FROM vaccination vac
     JOIN rendez_vous rdv ON rdv.id = vac.rendez_vous_id
     JOIN session s ON s.id = rdv.session_id
     WHERE vac.id = $1`,
    [vaccinationId],
  );
  const vaccination = result.rows[0];
  if (!vaccination) throw ApiError.notFound('Vaccination not found');
  if (user.role === 'parent' && !sameId(vaccination.parent_id, user.id)) {
    throw ApiError.forbidden('This vaccination belongs to another parent');
  }
  if (user.role === 'infirmier') assertCentreAccess(user, vaccination.centre_id);
  return vaccination;
};

const assertQueueEntryAccess = async (user, entryId, client) => {
  const result = await dbFor(client).query('SELECT * FROM file_attente WHERE id = $1', [entryId]);
  const entry = result.rows[0];
  if (!entry) throw ApiError.notFound('Queue entry not found');
  if (user.role === 'parent' && !sameId(entry.parent_id, user.id)) {
    throw ApiError.forbidden('This queue entry belongs to another parent');
  }
  if (user.role === 'infirmier') assertCentreAccess(user, entry.centre_id);
  return entry;
};

const assertStockAccess = async (user, stockId, client) => {
  const result = await dbFor(client).query('SELECT * FROM stock WHERE id = $1', [stockId]);
  const stock = result.rows[0];
  if (!stock) throw ApiError.notFound('Stock entry not found');
  if (user.role !== 'admin') assertCentreAccess(user, stock.centre_id);
  return stock;
};

module.exports = {
  assertBebeAccess,
  assertCentreAccess,
  assertFlaconAccess,
  assertParentAccess,
  assertQueueEntryAccess,
  assertRendezVousAccess,
  assertSessionAccess,
  assertStockAccess,
  assertVaccinationAccess,
  scopeCentre,
};
