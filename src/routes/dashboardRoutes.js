const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateUser } = require('../middleware/auth/userAuth');

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get optimized dashboard data
 *     description: Returns all key dashboard data in a single optimized call
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                         finance:
 *                           type: object
 *                         totalOwed:
 *                           type: number
 *                     house:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         hsi:
 *                           type: integer
 *                         balance:
 *                           type: number
 *                     charges:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: array
 *                         totalOwed:
 *                           type: number
 *                     summary:
 *                       type: object
 *       400:
 *         description: User not associated with a house
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateUser, dashboardController.getDashboard);

/**
 * @swagger
 * /dashboard/house/{houseId}/overview:
 *   get:
 *     summary: Get house overview data
 *     description: Returns house-wide statistics and summary data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: House ID
 *     responses:
 *       200:
 *         description: House overview retrieved successfully
 *       403:
 *         description: Unauthorized access to house
 */
router.get('/house/:houseId/overview', authenticateUser, dashboardController.getHouseOverview);

/**
 * @swagger
 * /dashboard/financial-summary:
 *   get:
 *     summary: Get user financial summary
 *     description: Returns lightweight financial data for quick loading
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully
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
 *                     finance:
 *                       type: object
 *                       properties:
 *                         balance:
 *                           type: number
 *                         credit:
 *                           type: number
 *                         points:
 *                           type: integer
 *                     pending:
 *                       type: object
 *                       properties:
 *                         totalOwed:
 *                           type: number
 *                         chargeCount:
 *                           type: integer
 *                         nextDueDate:
 *                           type: string
 *                           format: date-time
 */
router.get('/financial-summary', authenticateUser, dashboardController.getUserFinancialSummary);

module.exports = router; 