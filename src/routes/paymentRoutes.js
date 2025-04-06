// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const webhookController = require('../controllers/webhookController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

router.use(authenticateUser);
/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         taskId:
 *           type: integer
 *         userId:
 *           type: integer
 *         amount:
 *           type: number
 *           format: decimal
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         stripePaymentIntentId:
 *           type: string
 *         paymentDate:
 *           type: string
 *           format: date-time
 *         retryCount:
 *           type: integer
 *         errorMessage:
 *           type: string
 *     PaymentRetryRequest:
 *       type: object
 *       required:
 *         - paymentMethodId
 *       properties:
 *         paymentMethodId:
 *           type: string
 *           description: The ID of the payment method to use for retry
 *     RoommateStatus:
 *       type: object
 *       properties:
 *         allPledged:
 *           type: boolean
 *         allPaid:
 *           type: boolean
 *         totalTasks:
 *           type: integer
 *         pledgedCount:
 *           type: integer
 *         paidCount:
 *           type: integer
 */

/**
 * @swagger
 * /api/payments/tasks/{taskId}:
 *   post:
 *     summary: Process payment for a task
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 roommatestatus:
 *                   $ref: '#/components/schemas/RoommateStatus'
 *       400:
 *         description: Invalid request or payment processing failed
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Task not found
 */
router.post('/tasks/:taskId', catchAsync(paymentController.processPayment));

router.post('/batch', catchAsync(paymentController.processBatchPayment));
/**
 * @swagger
 * /api/payments/{paymentId}/status:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *                 bundleStatus:
 *                   $ref: '#/components/schemas/RoommateStatus'
 */
router.get('/:paymentId/status', catchAsync(paymentController.getPaymentStatus));

/**
 * @swagger
 * /api/payments/{paymentId}/retry:
 *   post:
 *     summary: Retry a failed payment
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRetryRequest'
 *     responses:
 *       200:
 *         description: Payment retry initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 payment:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Maximum retry attempts reached or invalid payment state
 *       404:
 *         description: Payment not found
 */
router.post('/:paymentId/retry', catchAsync(paymentController.retryPayment));

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Payments]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature or payload
 */
router.post('/webhook', 
  express.raw({type: 'application/json'}),
  webhookController.handleWebhook
);




module.exports = router;