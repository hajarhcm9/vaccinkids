'use strict';

const ApiError = require('../utils/ApiError');

const COMMAND_MATRIX = Object.freeze({
  infirmier: Object.freeze({
    rendez_vous: Object.freeze(['UPDATE']),
    session: Object.freeze(['UPDATE']),
    file_attente: Object.freeze(['UPDATE']),
  }),
  admin: Object.freeze({
    rendez_vous: Object.freeze(['UPDATE']),
    session: Object.freeze(['UPDATE']),
    file_attente: Object.freeze(['UPDATE']),
  }),
});

const STATUS_RULES = Object.freeze({
  rendez_vous: Object.freeze({
    infirmier: Object.freeze({
      EN_ATTENTE: Object.freeze(['CONFIRME', 'PRESENT', 'ABSENT', 'EN_LISTE_ATTENTE']),
      CONFIRME: Object.freeze(['PRESENT', 'ABSENT']),
      EN_LISTE_ATTENTE: Object.freeze(['CONFIRME', 'ABSENT']),
    }),
    admin: Object.freeze({
      EN_ATTENTE: Object.freeze(['CONFIRME', 'PRESENT', 'ABSENT', 'ANNULE', 'EN_LISTE_ATTENTE']),
      CONFIRME: Object.freeze(['PRESENT', 'ABSENT', 'ANNULE']),
      EN_LISTE_ATTENTE: Object.freeze(['EN_ATTENTE', 'CONFIRME', 'ABSENT', 'ANNULE']),
      PRESENT: Object.freeze(['ABSENT']),
      ABSENT: Object.freeze(['PRESENT']),
    }),
  }),
  session: Object.freeze({
    infirmier: Object.freeze({
      CONFIRMEE: Object.freeze(['EN_COURS']),
      EN_COURS: Object.freeze(['TERMINEE']),
    }),
    admin: Object.freeze({
      EN_FORMATION: Object.freeze(['CONFIRMEE', 'ANNULEE']),
      CONFIRMEE: Object.freeze(['EN_COURS', 'ANNULEE']),
      EN_COURS: Object.freeze(['TERMINEE', 'ANNULEE']),
    }),
  }),
  file_attente: Object.freeze({
    infirmier: Object.freeze({
      EN_ATTENTE: Object.freeze(['EN_COURS', 'ABANDONNE']),
      EN_COURS: Object.freeze(['TERMINE', 'ABANDONNE']),
    }),
    admin: Object.freeze({
      EN_ATTENTE: Object.freeze(['EN_COURS', 'ABANDONNE']),
      EN_COURS: Object.freeze(['TERMINE', 'ABANDONNE']),
    }),
  }),
});

function assertPositiveInteger(value, field) {
  if (!Number.isInteger(Number(value)) || Number(value) <= 0) {
    throw ApiError.badRequest(field + ' must be a positive integer');
  }
  return Number(value);
}

function assertPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw ApiError.badRequest('Payload must be an object');
  }
  const keys = Object.keys(payload);
  if (keys.length !== 1 || keys[0] !== 'statut' || typeof payload.statut !== 'string') {
    throw ApiError.badRequest('Only the statut field can be synchronized');
  }
}

function assertCommandAllowed(item, userRole) {
  const roleCommands = COMMAND_MATRIX[userRole];
  const operations = roleCommands && roleCommands[item.entity_type];
  if (!operations || !operations.includes(item.operation)) {
    throw ApiError.forbidden(
      'Sync command not allowed for role ' +
        userRole +
        ': ' +
        item.operation +
        ' ' +
        item.entity_type,
    );
  }
  assertPayload(item.payload);
}

function assertTransition(entityType, userRole, currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  const allowed = STATUS_RULES[entityType]?.[userRole]?.[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw ApiError.conflict(
      'Invalid ' + entityType + ' status transition: ' + currentStatus + ' -> ' + nextStatus,
    );
  }
}

async function lockAuthorizedResource(client, item, userId, userRole) {
  const entityId = assertPositiveInteger(item.entity_id, 'entity_id');
  let result;

  if (item.entity_type === 'rendez_vous') {
    result = await client.query(
      'SELECT rv.*, s.centre_id FROM rendez_vous rv ' +
        'JOIN session s ON s.id = rv.session_id ' +
        'WHERE rv.id = $1 AND ($2::text = $3::text OR s.centre_id = (SELECT centre_id FROM personnel WHERE id = $4)) ' +
        'FOR UPDATE OF rv',
      [entityId, userRole, 'admin', userId],
    );
  } else if (item.entity_type === 'session') {
    result = await client.query(
      'SELECT s.* FROM session s ' +
        'WHERE s.id = $1 AND ($2::text = $3::text OR s.centre_id = (SELECT centre_id FROM personnel WHERE id = $4)) ' +
        'FOR UPDATE OF s',
      [entityId, userRole, 'admin', userId],
    );
  } else if (item.entity_type === 'file_attente') {
    result = await client.query(
      'SELECT fa.* FROM file_attente fa ' +
        'WHERE fa.id = $1 AND ($2::text = $3::text OR fa.centre_id = (SELECT centre_id FROM personnel WHERE id = $4)) ' +
        'FOR UPDATE OF fa',
      [entityId, userRole, 'admin', userId],
    );
  }

  if (!result?.rows[0]) {
    throw ApiError.forbidden('Resource not found or outside the authorized centre');
  }
  return result.rows[0];
}

async function updateStatus(client, item, current) {
  const table = item.entity_type === 'session' ? 'session' : item.entity_type;
  const result = await client.query(
    'UPDATE ' + table + ' SET statut = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [item.payload.statut, current.id],
  );
  return result.rows[0];
}

async function executeCommand(client, item, userId, userRole) {
  assertCommandAllowed(item, userRole);
  const current = await lockAuthorizedResource(client, item, userId, userRole);
  const clientTimestamp = new Date(item.client_timestamp);

  if (new Date(current.updated_at) > clientTimestamp) {
    return { conflict: true, current };
  }

  assertTransition(item.entity_type, userRole, current.statut, item.payload.statut);
  if (current.statut === item.payload.statut)
    return { conflict: false, item: current, replay: true };

  const updated = await updateStatus(client, item, current);
  return { conflict: false, item: updated, replay: false };
}

module.exports = {
  COMMAND_MATRIX,
  assertCommandAllowed,
  executeCommand,
};
