// src/routes/userRoutes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const paymentController = require('../controllers/paymentController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');
const { 
  optimizePaymentConnection, 
  monitorPaymentPerformance 
} = require('../middleware/paymentOptimization');

router.use(authenticateUser);

/**
 * @swagger
 * /users/{id}/payments:
 *   get:
 *     summary: Get all payments made by the user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of payments with associated charge details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: User not found
 */
router.get('/:id/payments', optimizePaymentConnection, monitorPaymentPerformance, catchAsync(paymentController.getUserPayments));
router.get('/:id/dashboard', optimizePaymentConnection, monitorPaymentPerformance, catchAsync(userController.getDashboardData));
// Existing user routes:
router.get('/:id', catchAsync(userController.getUser));
router.get('/', catchAsync(userController.getAllUsers));
router.post(
  '/',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
  ],
  catchAsync(userController.createUser)
);
router.put('/:id', catchAsync(userController.updateUser));
router.delete('/:id', catchAsync(userController.deleteUser));
router.put('/:id/house', catchAsync(userController.updateUserHouse));
router.put('/:id/join-house', catchAsync(userController.joinHouse));

/**
 * @swagger
 * /users/{id}/complete-onboarding:
 *   post:
 *     summary: Complete user onboarding process
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     onboarded:
 *                       type: boolean
 *                     onboarding_step:
 *                       type: string
 *                     onboarded_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing house or payment method
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: User not found
 */
router.post('/:id/complete-onboarding', catchAsync(userController.completeOnboarding));

module.exports = router;
