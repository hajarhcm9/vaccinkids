'use strict';

var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var syncController = require('../controllers/syncController');
var rbacMiddleware = require('../middleware/rbacMiddleware');
router.use(authMiddleware.authenticate);

router.get('/pull', syncController.pull);
router.post('/push', rbacMiddleware.authorize('admin', 'infirmier'), syncController.push);
router.get('/status', syncController.getStatus);
router.get('/queue', rbacMiddleware.authorize('admin', 'infirmier'), syncController.getQueue);
router.post('/queue', rbacMiddleware.authorize('admin', 'infirmier'), syncController.addToQueue);
router.post('/resolve/:id', rbacMiddleware.authorize('admin'), syncController.resolveConflict);

module.exports = router;
