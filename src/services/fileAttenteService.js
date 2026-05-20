'use strict';

var pool = require('../config/database').pool;

async function joinQueue(rdvId, centreId, sessionId, parentId, bebeId) {
  var maxNum = await pool.query(
    'SELECT COALESCE(MAX(numero_attente), 0) + 1 AS next_num FROM file_attente WHERE centre_id = $1 AND DATE(heure_arrivee) = CURRENT_DATE',
    [centreId]
  );
  var numeroAttente = maxNum.rows[0].next_num;
  var result = await pool.query(
    'INSERT INTO file_attente (numero_attente, rendez_vous_id, centre_id, session_id, parent_id, bebe_id, statut, heure_arrivee) ' +
    'VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
    [numeroAttente, rdvId, centreId, sessionId, parentId, bebeId, 'EN_ATTENTE']
  );
  return result.rows[0];
}

async function getQueueByCentre(centreId, statut) {
  var q = 'SELECT fa.*, b.prenom AS bebe_prenom, b.nom AS bebe_nom, p.telephone AS parent_telephone ' +
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
    [sessionId]
  );
  return result.rows;
}

async function callNext(centreId) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'EN_COURS', heure_debut_service = NOW() " +
    "WHERE id = (SELECT id FROM file_attente WHERE centre_id = $1 AND statut = 'EN_ATTENTE' AND DATE(heure_arrivee) = CURRENT_DATE ORDER BY numero_attente ASC LIMIT 1) " +
    'RETURNING *',
    [centreId]
  );
  return result.rows[0] || null;
}

async function completeService(id) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'TERMINE', heure_fin_service = NOW(), updated_at = NOW() WHERE id = $1 AND statut = 'EN_COURS' RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

async function abandonEntry(id) {
  var result = await pool.query(
    "UPDATE file_attente SET statut = 'ABANDONNE', updated_at = NOW() WHERE id = $1 RETURNING *",
    [id]
  );
  return result.rows[0] || null;
}

async function getParentPosition(parentId) {
  var result = await pool.query(
    "SELECT fa.*, " +
    "(SELECT COUNT(*) FROM file_attente fa2 WHERE fa2.centre_id = fa.centre_id AND fa2.statut = 'EN_ATTENTE' AND fa2.numero_attente < fa.numero_attente AND DATE(fa2.heure_arrivee) = CURRENT_DATE) AS position " +
    "FROM file_attente fa " +
    "WHERE fa.parent_id = $1 AND fa.statut = 'EN_ATTENTE' AND DATE(fa.heure_arrivee) = CURRENT_DATE ORDER BY fa.numero_attente ASC LIMIT 1",
    [parentId]
  );
  return result.rows[0] || null;
}

async function getEstimatedWaitTime(parentId) {
  var entry = await getParentPosition(parentId);
  if (!entry) return { waitTimeMinutes: 0, position: 0 };
  var pos = parseInt(entry.position) || 0;
  var avgTime = await pool.query(
    'SELECT AVG(EXTRACT(EPOCH FROM (heure_fin_service - heure_debut_service)) / 60) AS avg_minutes ' +
    "FROM file_attente WHERE statut = 'TERMINE' AND DATE(heure_arrivee) = CURRENT_DATE"
  );
  var avgMin = parseFloat(avgTime.rows[0]?.avg_minutes) || 15;
  return { waitTimeMinutes: Math.ceil(pos * avgMin), position: pos + 1 };
}

async function getStats(centreId) {
  var base = 'DATE(heure_arrivee) = CURRENT_DATE';
  var cFilter = centreId ? ' AND centre_id = ' + parseInt(centreId) : '';
  var total = await pool.query('SELECT COUNT(*) AS c FROM file_attente WHERE ' + base + cFilter);
  var waiting = await pool.query("SELECT COUNT(*) AS c FROM file_attente WHERE statut = 'EN_ATTENTE' AND " + base + cFilter);
  var serving = await pool.query("SELECT COUNT(*) AS c FROM file_attente WHERE statut = 'EN_COURS' AND " + base + cFilter);
  var done = await pool.query("SELECT COUNT(*) AS c FROM file_attente WHERE statut = 'TERMINE' AND " + base + cFilter);
  return {
    total: parseInt(total.rows[0].c) || 0,
    enAttente: parseInt(waiting.rows[0].c) || 0,
    enCours: parseInt(serving.rows[0].c) || 0,
    termine: parseInt(done.rows[0].c) || 0
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
  getStats: getStats
};