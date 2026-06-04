'use strict';

var syncService = require('../services/syncService');
var config = require('../config');
var responseHandler = require('../utils/responseHandler');
var success = responseHandler.success;
var error = responseHandler.error;

var pull = async function (req, res, next) {
  try {
    var since = req.query.since;
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var result = await syncService.pullChanges(since, userId, userRole, req.user.centre_id);
    return success(res, 200, 'Sync pull successful', result);
  } catch (err) {
    return next(err);
  }
};

var push = async function (req, res, next) {
  try {
    if (!config.sync.pushEnabled) {
      return error(res, 'Sync push is temporarily disabled', 503);
    }
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

var getStatus = async function (req, res, next) {
  try {
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var status = await syncService.getSyncStatus(userId, userRole);
    return success(res, 200, 'Sync status retrieved', status);
  } catch (err) {
    return next(err);
  }
};

var getQueue = async function (req, res, next) {
  try {
    var userId = req.user.id || req.user.userId;
    var userRole = req.user.role;
    var items = await syncService.getPendingQueue(userId, userRole);
    return success(res, 200, 'Queue retrieved', items);
  } catch (err) {
    return next(err);
  }
};

var resolveConflict = async function (req, res, next) {
  try {
    var id = req.params.id;
    var resolution = req.body.resolution;
    var userRole = req.user.role;
    if (!resolution) {
      return error(res, 'Resolution strategy is required', 400);
    }
    if (resolution !== 'SERVER_WINS') {
      return error(res, 'Only SERVER_WINS conflict resolution is allowed', 400);
    }
    var result = await syncService.resolveConflict(parseInt(id), resolution, userRole);
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
  resolveConflict: resolveConflict,
};
