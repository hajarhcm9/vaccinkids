'use strict';

var express = require('express');
var router = express.Router();
var authMiddleware = require('../middleware/authMiddleware');
var syncController = require('../controllers/syncController');

router.use(authMiddleware.authenticate);

router.get('/pull', syncController.pull);
router.post('/push', syncController.push);
router.get('/status', syncController.getStatus);
router.get('/queue', syncController.getQueue);
router.post('/queue', syncController.addToQueue);
router.post('/resolve/:id', syncController.resolveConflict);

module.exports = router;
