const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');
const { requireOnboarding, requireOnboardingForHouse } = require('../middleware/onboardingProtection');

// Apply authentication to all dashboard routes
router.use(authenticateUser);

/**
 * @swagger
 * /dashboard/user/{userId}:
 *   get:
 *     summary: Get comprehensive dashboard data for a user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Complete dashboard data including user finances, house info, pending charges, tasks, etc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         finance:
 *                           type: object
 *                           properties:
 *                             balance:
 *                               type: number
 *                             credit:
 *                               type: number
 *                             points:
 *                               type: integer
 *                     house:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         hsi:
 *                           type: object
 *                           properties:
 *                             score:
 *                               type: integer
 *                             bracket:
 *                               type: integer
 *                     pendingCharges:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalOwed:
 *                           type: string
 *                         overdueCount:
 *                           type: integer
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', requireOnboarding, catchAsync(dashboardController.getUserDashboard));

/**
 * @swagger
 * /dashboard/user/{userId}/summary:
 *   get:
 *     summary: Get lightweight dashboard summary for a user
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Essential dashboard summary for quick loading
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         username:
 *                           type: string
 *                         balance:
 *                           type: number
 *                         points:
 *                           type: integer
 *                     summary:
 *                       type: object
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: User not found
 */
router.get('/user/:userId/summary', requireOnboarding, catchAsync(dashboardController.getUserSummary));

/**
 * @swagger
 * /dashboard/house/{houseId}/financial-overview:
 *   get:
 *     summary: Get comprehensive financial overview for a house
 *     tags: [Dashboard]
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     responses:
 *       200:
 *         description: House financial data including HSI, pending bills, transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     house:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         finance:
 *                           type: object
 *                           properties:
 *                             balance:
 *                               type: number
 *                             ledger:
 *                               type: number
 *                         hsi:
 *                           type: object
 *                           properties:
 *                             score:
 *                               type: integer
 *                             bracket:
 *                               type: integer
 *                             feeMultiplier:
 *                               type: number
 *                     pendingBills:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalOutstanding:
 *                           type: string
 *                         totalAdvanced:
 *                           type: string
 *       403:
 *         description: Unauthorized access to house data
 *       404:
 *         description: House not found
 */
router.get('/house/:houseId/financial-overview', requireOnboardingForHouse, catchAsync(dashboardController.getHouseFinancialOverview));

module.exports = router; 