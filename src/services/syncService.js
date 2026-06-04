'use strict';

const database = require('../config/database');
const pool = database.pool;
const getClient = database.getClient;
const ApiError = require('../utils/ApiError');
const syncCommandService = require('./syncCommandService');

const MAX_PULL_ROWS_PER_ENTITY = 500;
const CLIENT_OPERATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const ENTITY_ALIASES = Object.freeze({
  rendez_vous: 'rv',
  bebe: 'b',
  vaccination: 'vac',
  session: 's',
  file_attente: 'fa',
});

const PULL_QUERIES = Object.freeze({
  admin: Object.freeze({
    rendez_vous: 'SELECT rv.* FROM rendez_vous rv',
    bebe: 'SELECT b.* FROM bebe b',
    vaccination: 'SELECT vac.* FROM vaccination vac',
    session: 'SELECT s.* FROM session s',
    file_attente: 'SELECT fa.* FROM file_attente fa',
  }),
  infirmier: Object.freeze({
    rendez_vous:
      'SELECT rv.* FROM rendez_vous rv JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $3',
    bebe:
      'SELECT DISTINCT b.* FROM bebe b JOIN rendez_vous rv ON rv.bebe_id = b.id ' +
      'JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $3',
    vaccination:
      'SELECT vac.* FROM vaccination vac JOIN rendez_vous rv ON rv.id = vac.rendez_vous_id ' +
      'JOIN session s ON s.id = rv.session_id WHERE s.centre_id = $3',
    session: 'SELECT s.* FROM session s WHERE s.centre_id = $3',
    file_attente: 'SELECT fa.* FROM file_attente fa WHERE fa.centre_id = $3',
  }),
  parent: Object.freeze({
    rendez_vous: 'SELECT rv.* FROM rendez_vous rv WHERE rv.parent_id = $3',
    bebe: 'SELECT b.* FROM bebe b WHERE b.parent_id = $3',
    vaccination:
      'SELECT vac.* FROM vaccination vac JOIN rendez_vous rv ON rv.id = vac.rendez_vous_id ' +
      'WHERE rv.parent_id = $3',
    session:
      'SELECT DISTINCT s.* FROM session s LEFT JOIN rendez_vous rv ON rv.session_id = s.id ' +
      "WHERE ((s.date_session >= CURRENT_DATE AND s.statut NOT IN ('ANNULEE', 'TERMINEE')) OR rv.parent_id = $3)",
    file_attente: 'SELECT fa.* FROM file_attente fa WHERE fa.parent_id = $3',
  }),
});

function parseSince(since) {
  if (!since) return new Date(0);
  const parsed = new Date(since);
  if (Number.isNaN(parsed.getTime())) throw ApiError.badRequest('Invalid since timestamp');
  return parsed;
}

function getPullScope(userId, userRole, centreId) {
  if (!PULL_QUERIES[userRole]) throw ApiError.forbidden('Role cannot use synchronization');
  if (userRole === 'infirmier') {
    if (!centreId) throw ApiError.forbidden('No centre assigned to this personnel account');
    return Number(centreId);
  }
  return Number(userId);
}

function appendDeltaBounds(entity, baseQuery) {
  const hasWhere = /\bWHERE\b/i.test(baseQuery);
  const alias = ENTITY_ALIASES[entity];
  return (
    baseQuery +
    (hasWhere ? ' AND ' : ' WHERE ') +
    alias +
    '.updated_at > $1 AND ' +
    alias +
    '.updated_at <= $2 ORDER BY ' +
    alias +
    '.updated_at ASC, ' +
    alias +
    '.id ASC LIMIT ' +
    MAX_PULL_ROWS_PER_ENTITY
  );
}

async function pullChanges(since, userId, userRole, centreId) {
  const sinceDate = parseSince(since);
  const upperBound = new Date();
  const scope = getPullScope(userId, userRole, centreId);
  const queries = PULL_QUERIES[userRole];
  const changes = {};
  const hasMore = {};

  for (const [entity, baseQuery] of Object.entries(queries)) {
    const params = userRole === 'admin' ? [sinceDate, upperBound] : [sinceDate, upperBound, scope];
    const result = await pool.query(appendDeltaBounds(entity, baseQuery), params);
    changes[entity] = result.rows;
    hasMore[entity] = result.rows.length === MAX_PULL_ROWS_PER_ENTITY;
  }

  return { changes, hasMore, timestamp: upperBound.toISOString() };
}

function validatePushItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw ApiError.badRequest('Each sync item must be an object');
  }
  if (!CLIENT_OPERATION_ID_PATTERN.test(String(item.client_operation_id || ''))) {
    throw ApiError.badRequest('client_operation_id is required and has an invalid format');
  }
  if (!item.client_timestamp || Number.isNaN(new Date(item.client_timestamp).getTime())) {
    throw ApiError.badRequest('A valid client_timestamp is required');
  }
  if (new Date(item.client_timestamp).getTime() > Date.now() + 5 * 60 * 1000) {
    throw ApiError.badRequest('client_timestamp is too far in the future');
  }
}

async function findReplay(client, userId, userRole, clientOperationId) {
  const result = await client.query(
    'SELECT id, operation, entity_type, entity_id, payload, client_timestamp, status, ' +
      'conflict_resolution, error_message FROM sync_queue ' +
      'WHERE user_id = $1 AND user_role = $2 AND client_operation_id = $3',
    [userId, userRole, clientOperationId],
  );
  return result.rows[0] || null;
}

function assertReplayMatches(replay, item) {
  const storedPayload =
    typeof replay.payload === 'string' ? JSON.parse(replay.payload) : replay.payload;
  const sameCommand =
    replay.operation === item.operation &&
    replay.entity_type === item.entity_type &&
    Number(replay.entity_id) === Number(item.entity_id) &&
    JSON.stringify(storedPayload) === JSON.stringify(item.payload) &&
    new Date(replay.client_timestamp).getTime() === new Date(item.client_timestamp).getTime();
  if (!sameCommand) {
    throw ApiError.conflict('client_operation_id was already used for a different command');
  }
}

async function logResult(client, item, userId, userRole, status, errorMessage) {
  const result = await client.query(
    'INSERT INTO sync_queue ' +
      '(user_id, user_role, operation, entity_type, entity_id, payload, client_timestamp, ' +
      'client_operation_id, status, conflict_resolution, error_message) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
    [
      userId,
      userRole,
      item.operation,
      item.entity_type,
      item.entity_id,
      JSON.stringify(item.payload),
      item.client_timestamp,
      item.client_operation_id,
      status,
      'SERVER_WINS',
      errorMessage || null,
    ],
  );
  return result.rows[0];
}

async function pushChanges(items, userId, userRole) {
  for (const item of items) {
    validatePushItem(item);
    syncCommandService.assertCommandAllowed(item, userRole);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const results = [];

    for (const item of items) {
      const replay = await findReplay(client, userId, userRole, item.client_operation_id);
      if (replay) {
        assertReplayMatches(replay, item);
        results.push({ status: replay.status, replay: true, queueItemId: replay.id });
        continue;
      }

      const commandResult = await syncCommandService.executeCommand(client, item, userId, userRole);
      if (commandResult.conflict) {
        const queueItem = await logResult(
          client,
          item,
          userId,
          userRole,
          'CONFLICT',
          'Server resource is newer than the client command',
        );
        results.push({ status: 'CONFLICT', replay: false, queueItemId: queueItem.id });
        continue;
      }

      const queueItem = await logResult(client, item, userId, userRole, 'APPLIED');
      results.push({
        status: 'APPLIED',
        replay: commandResult.replay,
        queueItemId: queueItem.id,
        item: commandResult.item,
      });
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getSyncStatus(userId, userRole) {
  const pending = await pool.query(
    'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'PENDING'],
  );
  const conflicts = await pool.query(
    'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'CONFLICT'],
  );
  const lastSync = await pool.query(
    'SELECT MAX(server_timestamp) as last_sync FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'APPLIED'],
  );

  return {
    pendingCount: parseInt(pending.rows[0].count),
    conflictCount: parseInt(conflicts.rows[0].count),
    lastSync: lastSync.rows[0].last_sync || null,
  };
}

async function getPendingQueue(userId, userRole) {
  if (userRole === 'admin') {
    const adminResult = await pool.query(
      'SELECT * FROM sync_queue WHERE status IN ($1, $2) ORDER BY client_timestamp ASC',
      ['PENDING', 'CONFLICT'],
    );
    return adminResult.rows;
  }
  const result = await pool.query(
    'SELECT * FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status IN ($3, $4) ORDER BY client_timestamp ASC',
    [userId, userRole, 'PENDING', 'CONFLICT'],
  );
  return result.rows;
}

async function resolveConflict(queueId, resolution, userRole) {
  if (resolution !== 'SERVER_WINS') {
    throw ApiError.badRequest('Only SERVER_WINS conflict resolution is allowed');
  }
  if (userRole !== 'admin') throw ApiError.forbidden('Only administrators can resolve conflicts');
  const result = await pool.query(
    'UPDATE sync_queue SET status = $1, conflict_resolution = $2, resolved_at = NOW() ' +
      'WHERE id = $3 AND status = $4 RETURNING *',
    ['REJECTED', 'SERVER_WINS', queueId, 'CONFLICT'],
  );
  if (!result.rows[0]) throw ApiError.notFound('Conflict queue item not found');
  return { status: 'REJECTED', resolution: 'SERVER_WINS' };
}

module.exports = {
  pullChanges,
  pushChanges,
  getSyncStatus,
  getPendingQueue,
  resolveConflict,
};
