// src/routes/paymentMethodRoutes.js
const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

router.use(authenticateUser);

// Setup and completion routes
router.post('/setup-intent', catchAsync(paymentMethodController.createSetupIntent));
router.post('/complete', catchAsync(paymentMethodController.completeSetupIntent));

// Payment method management routes
router.get('/', catchAsync(paymentMethodController.getPaymentMethods));
router.put('/:id/default', catchAsync(paymentMethodController.setDefaultPaymentMethod));
router.delete('/:id', catchAsync(paymentMethodController.removePaymentMethod));

module.exports = router;