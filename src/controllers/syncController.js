'use strict';

var syncService = require('../services/syncService');
var responseHandler = require('../utils/responseHandler');
var success = responseHandler.success;
var error = responseHandler.error;

var pull = async function(req, res, next) {
  try {
    var since = req.query.since;
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var result = await syncService.pullChanges(since, userId, userRole);
    return success(res, 200, 'Sync pull successful', result);
  } catch (err) {
    return next(err);
  }
};

var push = async function(req, res, next) {
  try {
    var items = req.body.items;
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    if (!items || !Array.isArray(items)) {
      return error(res, 'Items array is required', 400);
    }
    if (items.length > 100) {
      return error(res, 'Maximum 100 items per push', 400);
    }
    var results = await syncService.pushChanges(items, userId, userRole);
    return success(res, 200, 'Sync push processed', results);
  } catch (err) {
    return next(err);
  }
};

var getStatus = async function(req, res, next) {
  try {
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var status = await syncService.getSyncStatus(userId, userRole);
    return success(res, 200, 'Sync status retrieved', status);
  } catch (err) {
    return next(err);
  }
};

var getQueue = async function(req, res, next) {
  try {
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var items = await syncService.getPendingQueue(userId, userRole);
    return success(res, 200, 'Queue retrieved', items);
  } catch (err) {
    return next(err);
  }
};

var addToQueue = async function(req, res, next) {
  try {
    var operation = req.body.operation;
    var entity_type = req.body.entity_type;
    var entity_id = req.body.entity_id;
    var payload = req.body.payload;
    var client_timestamp = req.body.client_timestamp;
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    if (!operation || !entity_type || !payload) {
      return error(res, 'operation, entity_type and payload are required', 400);
    }
    if (!['CREATE', 'UPDATE', 'DELETE'].includes(operation)) {
      return error(res, 'Invalid operation. Must be CREATE, UPDATE or DELETE', 400);
    }
    var item = await syncService.addToQueue(userId, userRole, operation, entity_type, entity_id, payload, client_timestamp);
    return success(res, 201, 'Added to sync queue', item);
  } catch (err) {
    return next(err);
  }
};

var resolveConflict = async function(req, res, next) {
  try {
    var id = req.params.id;
    var resolution = req.body.resolution;
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    if (!resolution) {
      return error(res, 'Resolution strategy is required', 400);
    }
    if (!['SERVER_WINS', 'CLIENT_WINS'].includes(resolution)) {
      return error(res, 'Invalid resolution. Must be SERVER_WINS or CLIENT_WINS', 400);
    }
    var result = await syncService.resolveConflict(parseInt(id), resolution, userId, userRole);
    return success(res, 200, 'Conflict resolved', result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  pull: pull,
  push: push,
  getStatus: getStatus,
  getQueue: getQueue,
  addToQueue: addToQueue,
  resolveConflict: resolveConflict
};
