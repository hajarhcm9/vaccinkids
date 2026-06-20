'use strict';

const express = require('express');
const router = express.Router();
const GuestRdvController = require('../controllers/guestRdvController');

// Fully public — no authentication required
router.get('/centres', GuestRdvController.listPublicCentres);
router.get('/sessions', GuestRdvController.listPublicSessions);
router.post('/', GuestRdvController.createGuestRdv);

module.exports = router;
