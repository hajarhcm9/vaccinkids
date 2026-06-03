'use strict';

const { pool } = require('../config/database');

const SYNC_TABLES = [
  { table: 'rendez_vous', identifier: 'rendez_vous', entity: 'rendez_vous' },
  { table: 'bebe', identifier: 'bebe', entity: 'bebe' },
  { table: 'vaccination', identifier: 'vaccination', entity: 'vaccination' },
  { table: 'session', identifier: '"session"', entity: 'session' },
  { table: 'file_attente', identifier: 'file_attente', entity: 'file_attente' }
];

const VALID_ENTITIES = SYNC_TABLES.map(function(t) { return t.entity; });
const ENTITY_BY_NAME = SYNC_TABLES.reduce(function(acc, item) {
  acc[item.entity] = item;
  return acc;
}, {});

const ENTITY_COLUMNS = {
  rendez_vous: [
    'id', 'session_id', 'parent_id', 'bebe_id', 'statut', 'numero_attente',
    'date_creation', 'updated_at'
  ],
  bebe: [
    'id', 'parent_id', 'prenom', 'nom', 'date_naissance', 'sexe', 'photo_url',
    'code_qr', 'created_at', 'updated_at'
  ],
  vaccination: [
    'id', 'rendez_vous_id', 'personnel_id', 'flacon_id', 'date_heure', 'poids',
    'taille', 'reactions', 'created_at', 'updated_at'
  ],
  session: [
    'id', 'centre_id', 'vaccin_id', 'date_session', 'heure_debut', 'heure_fin',
    'statut', 'max_inscriptions', 'created_at', 'updated_at'
  ],
  file_attente: [
    'id', 'numero_attente', 'rendez_vous_id', 'centre_id', 'session_id',
    'parent_id', 'bebe_id', 'statut', 'heure_arrivee', 'heure_debut_service',
    'heure_fin_service', 'created_at', 'updated_at'
  ]
};

const getEntityMeta = function(entityType) {
  var meta = ENTITY_BY_NAME[entityType];
  if (!meta) throw new Error('Invalid entity type: ' + entityType);
  return meta;
};

const quoteColumn = function(column) {
  return '"' + column + '"';
};

const filterPayload = function(entityType, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be an object');
  }
  var allowed = ENTITY_COLUMNS[entityType];
  if (!allowed) throw new Error('Invalid entity type: ' + entityType);

  var filtered = {};
  var keys = Object.keys(payload);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!allowed.includes(key)) {
      throw new Error('Invalid column for ' + entityType + ': ' + key);
    }
    filtered[key] = payload[key];
  }
  return filtered;
};

const pullChanges = async function(since, userId, userRole) {
  var changes = {};
  var sinceDate = since ? new Date(since) : new Date(0);

  for (var i = 0; i < SYNC_TABLES.length; i++) {
    var item = SYNC_TABLES[i];
    var table = item.table;
    var identifier = item.identifier;
    var entity = item.entity;
    try {
      var query = 'SELECT * FROM ' + identifier + ' WHERE updated_at > $1';
      var params = [sinceDate];

      if (userRole === 'parent') {
        if (table === 'rendez_vous' || table === 'bebe' || table === 'file_attente') {
          query += ' AND parent_id = $2';
          params.push(userId);
        } else if (table === 'vaccination') {
          query += ' AND bebe_id IN (SELECT id FROM bebe WHERE parent_id = $2)';
          params.push(userId);
        }
      } else if (userRole === 'infirmier') {
        if (table === 'rendez_vous') {
          query += ' AND centre_id = (SELECT centre_id FROM personnel WHERE id = $2)';
          params.push(userId);
        }
      }

      query += ' ORDER BY updated_at ASC LIMIT 500';
      var result = await pool.query(query, params);
      changes[entity] = result.rows;
    } catch (err) {
      changes[entity] = [];
    }
  }

  return { changes: changes, timestamp: new Date().toISOString() };
};

const checkConflict = async function(item) {
  if (!item.entity_type || !item.entity_id) return false;
  if (!VALID_ENTITIES.includes(item.entity_type)) return false;

  try {
    var result = await pool.query(
      'SELECT updated_at FROM ' + getEntityMeta(item.entity_type).identifier + ' WHERE id = $1',
      [item.entity_id]
    );
    if (result.rows.length === 0) return false;
    var serverUpdated = new Date(result.rows[0].updated_at);
    var clientUpdated = new Date(item.client_timestamp);
    return serverUpdated > clientUpdated;
  } catch (err) {
    return false;
  }
};

const applyChange = async function(item, userId, userRole) {
  var operation = item.operation;
  var entity_type = item.entity_type;
  var entity_id = item.entity_id;
  var payload = item.payload;

  var meta = getEntityMeta(entity_type);
  var tableIdentifier = meta.identifier;

  if (operation === 'CREATE') {
    var safePayload = filterPayload(entity_type, payload);
    var createColumns = Object.keys(safePayload);
    if (createColumns.length === 0) throw new Error('Payload must contain at least one valid column');
    var columns = createColumns.map(quoteColumn).join(', ');
    var values = Object.values(safePayload);
    var placeholders = values.map(function(_, i) { return '$' + (i + 1); }).join(', ');
    var result = await pool.query(
      'INSERT INTO ' + tableIdentifier + ' (' + columns + ') VALUES (' + placeholders + ') RETURNING *',
      values
    );
    return result.rows[0];
  }

  if (operation === 'UPDATE') {
    var updatePayload = filterPayload(entity_type, payload);
    var updateColumns = Object.keys(updatePayload).filter(function(col) {
      return col !== 'id' && col !== 'updated_at';
    });
    if (updateColumns.length === 0) throw new Error('Payload must contain at least one valid update column');
    var values = updateColumns.map(function(col) { return updatePayload[col]; });
    var setClause = updateColumns.map(function(col, i) { return quoteColumn(col) + ' = $' + (i + 1); }).join(', ');
    var result = await pool.query(
      'UPDATE ' + tableIdentifier + ' SET ' + setClause + ', updated_at = NOW() WHERE id = $' + (values.length + 1) + ' RETURNING *',
      values.concat([entity_id])
    );
    return result.rows[0];
  }

  if (operation === 'DELETE') {
    var result = await pool.query(
      'DELETE FROM ' + tableIdentifier + ' WHERE id = $1 RETURNING *',
      [entity_id]
    );
    return result.rows[0];
  }

  throw new Error('Unknown operation: ' + operation);
};

const pushChanges = async function(items, userId, userRole) {
  var results = [];

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    try {
      var conflict = await checkConflict(item);

      if (conflict) {
        var queueResult = await pool.query(
          'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, entity_id, payload, client_timestamp, status, conflict_resolution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [userId, userRole, item.operation, item.entity_type, item.entity_id, JSON.stringify(item.payload), item.client_timestamp || new Date(), 'CONFLICT', 'SERVER_WINS']
        );
        results.push({ status: 'CONFLICT', item: queueResult.rows[0] });
      } else {
        var applied = await applyChange(item, userId, userRole);
        await pool.query(
          'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, entity_id, payload, client_timestamp, status, conflict_resolution) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
          [userId, userRole, item.operation, item.entity_type, item.entity_id, JSON.stringify(item.payload), item.client_timestamp || new Date(), 'APPLIED', 'SERVER_WINS']
        );
        results.push({ status: 'APPLIED', item: applied });
      }
    } catch (err) {
      await pool.query(
        'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, entity_id, payload, client_timestamp, status, conflict_resolution, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [userId, userRole, item.operation, item.entity_type, item.entity_id, JSON.stringify(item.payload), item.client_timestamp || new Date(), 'REJECTED', 'SERVER_WINS', err.message]
      );
      results.push({ status: 'REJECTED', error: err.message });
    }
  }

  return results;
};

const getSyncStatus = async function(userId, userRole) {
  var pending = await pool.query(
    'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'PENDING']
  );
  var conflicts = await pool.query(
    'SELECT COUNT(*) as count FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'CONFLICT']
  );
  var lastSync = await pool.query(
    'SELECT MAX(server_timestamp) as last_sync FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3',
    [userId, userRole, 'APPLIED']
  );

  return {
    pendingCount: parseInt(pending.rows[0].count),
    conflictCount: parseInt(conflicts.rows[0].count),
    lastSync: lastSync.rows[0].last_sync || null
  };
};

const addToQueue = async function(userId, userRole, operation, entityType, entityId, payload, clientTimestamp) {
  var result = await pool.query(
    'INSERT INTO sync_queue (user_id, user_role, operation, entity_type, entity_id, payload, client_timestamp, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [userId, userRole, operation, entityType, entityId, JSON.stringify(payload), clientTimestamp || new Date(), 'PENDING']
  );
  return result.rows[0];
};

const getPendingQueue = async function(userId, userRole) {
  var result = await pool.query(
    'SELECT * FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status IN ($3, $4) ORDER BY client_timestamp ASC',
    [userId, userRole, 'PENDING', 'CONFLICT']
  );
  return result.rows;
};

const resolveConflict = async function(queueId, resolution, userId, userRole) {
  var existing = await pool.query(
    'SELECT * FROM sync_queue WHERE id = $1 AND user_id = $2 AND user_role = $3',
    [queueId, userId, userRole]
  );

  if (existing.rows.length === 0) {
    throw new Error('Queue item not found');
  }

  var item = existing.rows[0];

  if (resolution === 'SERVER_WINS') {
    await pool.query(
      'UPDATE sync_queue SET status = $1, conflict_resolution = $2, resolved_at = NOW() WHERE id = $3',
      ['REJECTED', 'SERVER_WINS', queueId]
    );
    return { status: 'REJECTED', resolution: 'SERVER_WINS' };
  }

  if (resolution === 'CLIENT_WINS') {
    var payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
    var applied = await applyChange({
      operation: item.operation,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      payload: payload
    }, userId, userRole);

    await pool.query(
      'UPDATE sync_queue SET status = $1, conflict_resolution = $2, resolved_at = NOW() WHERE id = $3',
      ['APPLIED', 'CLIENT_WINS', queueId]
    );
    return { status: 'APPLIED', resolution: 'CLIENT_WINS', item: applied };
  }

  throw new Error('Unknown resolution: ' + resolution);
};

const processQueue = async function(userId, userRole) {
  var pending = await pool.query(
    'SELECT * FROM sync_queue WHERE user_id = $1 AND user_role = $2 AND status = $3 ORDER BY client_timestamp ASC',
    [userId, userRole, 'PENDING']
  );

  var results = [];
  for (var i = 0; i < pending.rows.length; i++) {
    var item = pending.rows[i];
    try {
      var payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
      await applyChange({
        operation: item.operation,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        payload: payload
      }, userId, userRole);

      await pool.query(
        'UPDATE sync_queue SET status = $1 WHERE id = $2',
        ['APPLIED', item.id]
      );
      results.push({ id: item.id, status: 'APPLIED' });
    } catch (err) {
      await pool.query(
        'UPDATE sync_queue SET status = $1, error_message = $2 WHERE id = $3',
        ['REJECTED', err.message, item.id]
      );
      results.push({ id: item.id, status: 'REJECTED', error: err.message });
    }
  }

  return results;
};

module.exports = {
  pullChanges: pullChanges,
  pushChanges: pushChanges,
  getSyncStatus: getSyncStatus,
  addToQueue: addToQueue,
  getPendingQueue: getPendingQueue,
  resolveConflict: resolveConflict,
  processQueue: processQueue
};
