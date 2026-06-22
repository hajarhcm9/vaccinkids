'use strict';

var database = require('../config/database');
var pool = database.pool;
var getClient = database.getClient;
var ApiError = require('../utils/ApiError');

async function joinQueue(rdvId, centreId, sessionId, parentId, bebeId) {
  if (!rdvId) {
    throw ApiError.badRequest('A valid appointment is required to join the queue');
  }

  var client = await getClient();
  try {
    await client.query('BEGIN');

    var appointmentResult = await client.query(
      'SELECT rv.id, rv.session_id, rv.bebe_id, s.centre_id, s.date_session, s.statut AS session_statut ' +
        'FROM rendez_vous rv JOIN session s ON s.id = rv.session_id ' +
        'WHERE rv.id = $1 AND rv.parent_id = $2 AND rv.bebe_id = $3 ' +
        "AND rv.statut = 'CONFIRME' AND s.date_session = CURRENT_DATE FOR UPDATE",
      [rdvId, parentId, bebeId],
    );
    var appointment = appointmentResult.rows[0];
    if (!appointment) {
      throw ApiError.forbidden('A confirmed appointment owned by this parent is required');
    }
    if (!['CONFIRMEE', 'EN_COURS'].includes(appointment.session_statut)) {
      throw ApiError.badRequest('Queue is only available during the active session day');
    }

    if (
      Number(centreId) !== Number(appointment.centre_id) ||
      (sessionId && Number(sessionId) !== Number(appointment.session_id))
    ) {
      throw ApiError.badRequest('Queue centre or session does not match the appointment');
    }

    var duplicateResult = await client.query(
      'SELECT id FROM file_attente WHERE rendez_vous_id = $1 ' +
        "AND statut IN ('EN_ATTENTE', 'EN_COURS') AND DATE(heure_arrivee) = CURRENT_DATE",
      [rdvId],
    );
    if (duplicateResult.rows[0]) {
      throw ApiError.conflict('This appointment is already in the queue');
    }

    await client.query('SELECT pg_advisory_xact_lock($1)', [Number(appointment.centre_id)]);
    var maxNum = await client.query(
      'SELECT COALESCE(MAX(numero_attente), 0) + 1 AS next_num FROM file_attente WHERE centre_id = $1 AND DATE(heure_arrivee) = CURRENT_DATE',
      [appointment.centre_id],
    );
    var numeroAttente = maxNum.rows[0].next_num;
    var result = await client.query(
      'INSERT INTO file_attente (numero_attente, rendez_vous_id, centre_id, session_id, parent_id, bebe_id, statut, heure_arrivee) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
      [
        numeroAttente,
        rdvId,
        appointment.centre_id,
        appointment.session_id,
        parentId,
        bebeId,
        'EN_ATTENTE',
      ],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getQueueByCentre(centreId, statut) {
  var q =
    'SELECT fa.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, p.telephone AS parent_telephone ' +
    'FROM file_attente fa ' +
    'JOIN bebe b ON fa.bebe_id = b.id ' +
    'JOIN parent p ON fa.parent_id = p.id ' +
    'WHERE fa.centre_id = $1 AND DATE(fa.heure_arrivee) = CURRENT_DATE';
  var params = [centreId];
  if (statut) {
    q += ' AND fa.statut = $2';
    params.push(statut);
  }
  q += ' ORDER BY fa.numero_attente ASC';
  var result = await pool.query(q, params);
  return result.rows;
}

async function getQueueBySession(sessionId) {
  var result = await pool.query(
    'SELECT fa.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom ' +
      'FROM file_attente fa ' +
      'JOIN bebe b ON fa.bebe_id = b.id ' +
      'WHERE fa.session_id = $1 ORDER BY fa.numero_attente ASC',
    [sessionId],
  );
  return result.rows;
}


async function callNext(centreId) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'EN_COURS', heure_debut_service = NOW(), updated_at = NOW() " +
      "WHERE id = (SELECT id FROM file_attente WHERE centre_id = $1 AND statut = 'EN_ATTENTE' AND DATE(heure_arrivee) = CURRENT_DATE ORDER BY numero_attente ASC LIMIT 1 FOR UPDATE SKIP LOCKED) " +
      "AND statut = 'EN_ATTENTE' " +
      'RETURNING *',
    [centreId],
  );
  return result.rows[0] || null;
}

async function completeService(id) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'TERMINE', heure_fin_service = NOW(), updated_at = NOW() WHERE id = $1 AND statut = 'EN_COURS' RETURNING *",
    [id],
  );
  return result.rows[0] || null;
}

async function abandonEntry(id, parentId) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'ABANDONNE', updated_at = NOW() " +
      'WHERE id = $1 AND ($2::integer IS NULL OR parent_id = $2) ' +
      "AND statut IN ('EN_ATTENTE', 'EN_COURS') RETURNING *",
    [id, parentId || null],
  );
  return result.rows[0] || null;
}

async function getParentPosition(parentId) {
  var result = await pool.query(
    'SELECT fa.*, ' +
      "CASE WHEN fa.statut = 'EN_COURS' THEN 0 ELSE " +
      "(SELECT COUNT(*) FROM file_attente fa2 WHERE fa2.centre_id = fa.centre_id AND fa2.statut = 'EN_ATTENTE' AND fa2.numero_attente < fa.numero_attente AND DATE(fa2.heure_arrivee) = CURRENT_DATE) END AS position " +
      'FROM file_attente fa ' +
      "WHERE fa.parent_id = $1 AND fa.statut IN ('EN_ATTENTE', 'EN_COURS') AND DATE(fa.heure_arrivee) = CURRENT_DATE " +
      "ORDER BY CASE WHEN fa.statut = 'EN_COURS' THEN 0 ELSE 1 END, fa.numero_attente ASC LIMIT 1",
    [parentId],
  );
  return result.rows[0] || null;
}

async function getEstimatedWaitTime(parentId) {
  var entry = await getParentPosition(parentId);
  if (!entry) return { waitTimeMinutes: 0, position: 0 };
  if (entry.statut === 'EN_COURS') return { waitTimeMinutes: 0, position: 0, status: entry.statut };
  var pos = parseInt(entry.position) || 0;
  var avgTime = await pool.query(
    'SELECT AVG(EXTRACT(EPOCH FROM (heure_fin_service - heure_debut_service)) / 60) AS avg_minutes ' +
      "FROM file_attente WHERE statut = 'TERMINE' AND DATE(heure_arrivee) = CURRENT_DATE",
  );
  var avgMin = parseFloat(avgTime.rows[0]?.avg_minutes) || 15;
  return { waitTimeMinutes: Math.ceil(pos * avgMin), position: pos + 1, status: entry.statut };
}

async function getStats(centreId) {
  var params = [];
  var whereClause = ' WHERE DATE(heure_arrivee) = CURRENT_DATE';

  if (centreId) {
    if (!/^\d+$/.test(String(centreId))) {
      throw new Error('Invalid centre_id');
    }
    var parsedCentreId = parseInt(centreId, 10);
    params.push(parsedCentreId);
    whereClause += ' AND centre_id = $' + params.length;
  }

  var total = await pool.query('SELECT COUNT(*) AS c FROM file_attente' + whereClause, params);
  var waiting = await pool.query(
    'SELECT COUNT(*) AS c FROM file_attente' + whereClause + " AND statut = 'EN_ATTENTE'",
    params,
  );
  var serving = await pool.query(
    'SELECT COUNT(*) AS c FROM file_attente' + whereClause + " AND statut = 'EN_COURS'",
    params,
  );
  var done = await pool.query(
    'SELECT COUNT(*) AS c FROM file_attente' + whereClause + " AND statut = 'TERMINE'",
    params,
  );
  return {
    total: parseInt(total.rows[0].c) || 0,
    enAttente: parseInt(waiting.rows[0].c) || 0,
    enCours: parseInt(serving.rows[0].c) || 0,
    termine: parseInt(done.rows[0].c) || 0,
  };
}

module.exports = {
  joinQueue: joinQueue,
  getQueueByCentre: getQueueByCentre,
  getQueueBySession: getQueueBySession,

  callNext: callNext,
  completeService: completeService,
  abandonEntry: abandonEntry,
  getParentPosition: getParentPosition,
  getEstimatedWaitTime: getEstimatedWaitTime,
  getStats: getStats,
};
