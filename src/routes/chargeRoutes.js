const express = require('express');
const router = express.Router({ mergeParams: true });
const chargeController = require('../controllers/chargeController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');
const { 
  cacheCharges, 
  optimizePaymentConnection, 
  monitorPaymentPerformance 
} = require('../middleware/paymentOptimization');
/**
 * @swagger
 * /users/{userId}/charges:
 *   get:
 *     summary: Get all charges for a specific user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of all charges for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   amount:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [pending, processing, paid, failed]
 */
router.get('/:userId/charges', authenticateUser, optimizePaymentConnection, monitorPaymentPerformance, cacheCharges, catchAsync(chargeController.getChargesForUser));

/**
 * @swagger
 * /users/{userId}/charges/unpaid:
 *   get:
 *     summary: Get all unpaid charges for a specific user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of all unpaid charges for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   amount:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [pending, processing, failed]
 */
router.get('/:userId/charges/unpaid', authenticateUser, optimizePaymentConnection, monitorPaymentPerformance, cacheCharges, catchAsync(chargeController.getUnpaidChargesForUser));

/**
 * @swagger
 * /users/{userId}/charges/paid:
 *   get:
 *     summary: Get all paid charges for a specific user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of all paid charges for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   amount:
 *                     type: integer
 *                   status:
 *                     type: string
 *                     enum: [paid]
 */
router.get('/:userId/charges/paid', authenticateUser, optimizePaymentConnection, monitorPaymentPerformance, cacheCharges, catchAsync(chargeController.getPaidChargesForUser));

/**
 * @swagger
 * /users/{userId}/charges/{id}:
 *   get:
 *     summary: Get a specific charge by its ID for a user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The charge ID
 *     responses:
 *       200:
 *         description: The specific charge details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 userId:
 *                   type: integer
 *                 amount:
 *                   type: number
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, paid, failed]
 *       404:
 *         description: Charge not found
 */
router.get('/:userId/charges/:id', authenticateUser, optimizePaymentConnection, monitorPaymentPerformance, catchAsync(chargeController.getChargeById));

module.exports = router;