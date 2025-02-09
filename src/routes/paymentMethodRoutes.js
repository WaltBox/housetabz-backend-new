/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The payment method ID
 *         type:
 *           type: string
 *           description: The type of payment method (e.g., 'card')
 *         card:
 *           type: object
 *           properties:
 *             brand:
 *               type: string
 *             last4:
 *               type: string
 *             exp_month:
 *               type: integer
 *             exp_year:
 *               type: integer
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default payment method
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * /api/payment-methods/setup-intent:
 *   post:
 *     tags:
 *       - Payment Methods
 *     summary: Create a setup intent for adding a payment method
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/payment-methods:
 *   post:
 *     tags:
 *       - Payment Methods
 *     summary: Add a new payment method
 *     security:
 *       - bearerAuth: []
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
 *                 description: The Stripe payment method ID
 *     responses:
 *       201:
 *         description: Payment method added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   
 *   get:
 *     tags:
 *       - Payment Methods
 *     summary: Get all payment methods for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/payment-methods/{id}/default:
 *   put:
 *     tags:
 *       - Payment Methods
 *     summary: Set a payment method as default
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment method ID
 *     responses:
 *       200:
 *         description: Payment method set as default successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 * 
 * /api/payment-methods/{id}:
 *   delete:
 *     tags:
 *       - Payment Methods
 *     summary: Remove a payment method
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment method ID
 *     responses:
 *       200:
 *         description: Payment method removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       500:
 *         description: Server error
 */

const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const auth = require('../middleware/auth');

router.post('/setup-intent', auth, paymentMethodController.createSetupIntent);
router.post('/', auth, paymentMethodController.addPaymentMethod);
router.get('/', auth, paymentMethodController.getPaymentMethods);
router.put('/:id/default', auth, paymentMethodController.setDefaultPaymentMethod);
router.delete('/:id', auth, paymentMethodController.removePaymentMethod);

// routes/paymentMethods.js
router.post('/complete', auth, paymentMethodController.completeSetupIntent);


module.exports = router;