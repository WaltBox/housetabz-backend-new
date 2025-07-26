// src/routes/paymentReminderRoutes.js - Payment Reminder Routes
const express = require('express');
const router = express.Router();
const paymentReminderController = require('../controllers/paymentReminderController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');

/**
 * @swagger
 * tags:
 *   name: Payment Reminders
 *   description: Payment reminder management and statistics
 */

/**
 * @swagger
 * /api/reminders/config:
 *   get:
 *     summary: Get payment reminder configuration
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment reminder configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 */
router.get('/config', authenticateUser, paymentReminderController.getConfig);

/**
 * @swagger
 * /api/reminders/stats:
 *   get:
 *     summary: Get payment reminder statistics
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment reminder statistics
 */
router.get('/stats', authenticateUser, paymentReminderController.getReminderStats);

/**
 * @swagger
 * /api/reminders/house/{houseId}/stats:
 *   get:
 *     summary: Get payment reminder statistics for a specific house
 *     tags: [Payment Reminders]
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
 *         description: House payment reminder statistics
 */
router.get('/house/:houseId/stats', authenticateUser, paymentReminderController.getHouseReminderStats);

/**
 * @swagger
 * /api/reminders/worker/status:
 *   get:
 *     summary: Get payment reminder worker status
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Worker status information
 */
router.get('/worker/status', authenticateUser, paymentReminderController.getWorkerStatus);

// Admin-only routes
/**
 * @swagger
 * /api/reminders/trigger:
 *   post:
 *     summary: Manually trigger payment reminders (Admin only)
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminders triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     advanceReminders:
 *                       type: integer
 *                     overdueReminders:
 *                       type: integer
 *                     roommateAlerts:
 *                       type: integer
 *                     errors:
 *                       type: integer
 */
router.post('/trigger', authenticateAdmin, paymentReminderController.triggerReminders);

/**
 * @swagger
 * /api/reminders/test:
 *   post:
 *     summary: Test payment reminder system (Admin only)
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [all, advance, overdue, roommate]
 *                 default: all
 *               userId:
 *                 type: integer
 *               houseId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Test completed successfully
 */
router.post('/test', authenticateAdmin, paymentReminderController.testReminders);

/**
 * @swagger
 * /api/reminders/worker/start:
 *   post:
 *     summary: Start payment reminder worker (Admin only)
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Worker started successfully
 */
router.post('/worker/start', authenticateAdmin, paymentReminderController.startWorker);

/**
 * @swagger
 * /api/reminders/worker/stop:
 *   post:
 *     summary: Stop payment reminder worker (Admin only)
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Worker stopped successfully
 */
router.post('/worker/stop', authenticateAdmin, paymentReminderController.stopWorker);

/**
 * @swagger
 * /api/reminders/worker/reset-stats:
 *   post:
 *     summary: Reset worker statistics (Admin only)
 *     tags: [Payment Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics reset successfully
 */
router.post('/worker/reset-stats', authenticateAdmin, paymentReminderController.resetWorkerStats);

module.exports = router; 