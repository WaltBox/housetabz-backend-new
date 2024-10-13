// routes/rhythmOfferRequests.js
const express = require('express');
const router = express.Router();
const { createRhythmOfferRequest } = require('../controllers/rhythmOfferRequestController');

// POST route to create a new offer request
router.post('/', createRhythmOfferRequest);

module.exports = router;
