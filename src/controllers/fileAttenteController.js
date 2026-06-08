'use strict';

var faService = require('../services/fileAttenteService');
var responseHandler = require('../utils/responseHandler');
var success = responseHandler.success;
var catchAsync = require('../utils/catchAsync');
var authorization = require('../services/resourceAuthorizationService');

var joinQueue = catchAsync(async function (req, res) {
  var parentId = req.user.role === 'parent' ? req.user.id : req.body.parent_id;
  var bebeId = req.body.bebe_id;
  var rdvId = req.body.rendez_vous_id;
  var centreId = req.body.centre_id || req.params.centreId;
  var sessionId = req.body.session_id;
  if (!parentId || !bebeId || !centreId) {
    return res
      .status(400)
      .json({ status: 'error', message: 'parent_id, bebe_id and centre_id are required' });
  }
  var entry = await faService.joinQueue(rdvId, centreId, sessionId, parentId, bebeId);
  return success(res, 201, 'Joined queue', entry);
});

var getQueueByCentre = catchAsync(async function (req, res) {
  var centreId = authorization.scopeCentre(req.user, req.params.centreId);
  var statut = req.query.statut;
  var entries = await faService.getQueueByCentre(centreId, statut);
  success(res, 200, 'Queue for centre', { entries: entries });
});

var getQueueBySession = catchAsync(async function (req, res) {
  var sessionId = req.params.sessionId;
  await authorization.assertSessionAccess(req.user, sessionId);
  var entries = await faService.getQueueBySession(sessionId);
  success(res, 200, 'Queue for session', { entries: entries });
});

var callNext = catchAsync(async function (req, res) {
  var centreId = authorization.scopeCentre(req.user, req.body.centre_id || req.params.centreId);
  var entry = await faService.callNext(centreId);
  if (!entry) return res.status(404).json({ status: 'error', message: 'No one waiting in queue' });
  return success(res, 200, 'Next patient called', entry);
});

var completeService = catchAsync(async function (req, res) {
  await authorization.assertQueueEntryAccess(req.user, req.params.id);
  var entry = await faService.completeService(req.params.id);
  if (!entry)
    return res.status(404).json({ status: 'error', message: 'Entry not found or not in service' });
  return success(res, 200, 'Service completed', entry);
});

var abandonEntry = catchAsync(async function (req, res) {
  await authorization.assertQueueEntryAccess(req.user, req.params.id);
  var parentId = req.user.role === 'parent' ? req.user.id : null;
  var entry = await faService.abandonEntry(req.params.id, parentId);
  if (!entry)
    return res.status(404).json({ status: 'error', message: 'Active queue entry not found' });
  return success(res, 200, 'Entry abandoned', entry);
});

var getMyPosition = catchAsync(async function (req, res) {
  var entry = await faService.getParentPosition(req.user.id);
  success(res, 200, 'Queue position', entry || { position: null });
});

var getWaitTime = catchAsync(async function (req, res) {
  var result = await faService.getEstimatedWaitTime(req.user.id);
  success(res, 200, 'Estimated wait time', result);
});

var getStats = catchAsync(async function (req, res) {
  var centreId = authorization.scopeCentre(req.user, req.query.centre_id || req.query.centreId);
  var stats = await faService.getStats(centreId);
  success(res, 200, 'Queue stats', stats);
});

var getKioskQueue = catchAsync(async function (req, res) {
  var entries = await faService.getKioskQueue(req.user.centre_id);
  success(res, 200, 'Kiosk queue', { entries: entries });
});

module.exports = {
  joinQueue: joinQueue,
  getQueueByCentre: getQueueByCentre,
  getQueueBySession: getQueueBySession,
  callNext: callNext,
  completeService: completeService,
  abandonEntry: abandonEntry,
  getMyPosition: getMyPosition,
  getWaitTime: getWaitTime,
  getStats: getStats,
  getKioskQueue: getKioskQueue,
};
