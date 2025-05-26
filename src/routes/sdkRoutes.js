// src/routes/sdkRoutes.js
const express = require('express');
const router = express.Router();
const sdkController = require('../controllers/sdkController');

// Check if house already has service for this partner
router.post('/check-house-service-status', sdkController.checkHouseServiceStatus);

// Resend webhook for existing house service
router.post('/resend-webhook', sdkController.resendWebhook);

module.exports = router;