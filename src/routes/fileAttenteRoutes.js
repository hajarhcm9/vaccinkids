'use strict';

var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var authenticate = authMiddleware.authenticate;
var rbacMiddleware = require('../middleware/rbacMiddleware');
var authorize = rbacMiddleware.authorize;
var controller = require('../controllers/fileAttenteController');
router.use(authenticate);
router.post('/', authorize('parent'), controller.joinQueue);
router.get('/centre/:centreId', authorize('admin', 'infirmier'), controller.getQueueByCentre);
router.get('/session/:sessionId', authorize('admin', 'infirmier'), controller.getQueueBySession);
router.patch('/call-next', authorize('infirmier', 'admin'), controller.callNext);
router.patch('/:id/complete', authorize('infirmier', 'admin'), controller.completeService);
router.patch('/:id/abandon', authorize('parent', 'infirmier', 'admin'), controller.abandonEntry);
router.get('/me/position', authorize('parent'), controller.getMyPosition);
router.get('/me/wait-time', authorize('parent'), controller.getWaitTime);
router.get('/stats', authorize('admin', 'infirmier'), controller.getStats);

module.exports = router;
