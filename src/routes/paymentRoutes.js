// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /payments/process:
 *   post:
 *     summary: Process a payment for a task
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - userId
 *               - amount
 *             properties:
 *               taskId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               amount:
 *                 type: number
 */
router.post('/process', paymentController.processPayment);

/**
 * @swagger
 * /payments/{taskId}/status:
 *   get:
 *     summary: Get payment status for a task
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:taskId/status', paymentController.getPaymentStatus);

module.exports = router;