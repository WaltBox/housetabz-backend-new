// src/routes/paymentMethodRoutes.js
const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const auth = require('../middleware/auth');

// Setup and completion routes
router.post('/setup-intent', auth, paymentMethodController.createSetupIntent);
router.post('/complete', auth, paymentMethodController.completeSetupIntent);

// Payment method management routes
router.get('/', auth, paymentMethodController.getPaymentMethods);
router.put('/:id/default', auth, paymentMethodController.setDefaultPaymentMethod);
router.delete('/:id', auth, paymentMethodController.removePaymentMethod);

module.exports = router;