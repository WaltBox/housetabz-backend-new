// src/routes/stripeWebhookRoutes.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/stripeWebhookController');

// Important: Use express.raw middleware to get the raw body
// This route needs special middleware to get the raw body for signature verification
router.post('/', 
  express.raw({ type: 'application/json' }), 
  webhookController.handleWebhook
);

module.exports = router;