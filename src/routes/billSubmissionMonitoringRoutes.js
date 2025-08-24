// src/routes/billSubmissionMonitoringRoutes.js

const express = require('express');
const router = express.Router();
const billSubmissionMonitoringController = require('../controllers/billSubmissionMonitoringController');
const { authenticateAdmin } = require('../middleware/auth/adminAuth');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * BILL SUBMISSION MONITORING ROUTES
 * 
 * Admin-only routes for monitoring and troubleshooting
 * variable recurring service bill submissions.
 * 
 * All routes require admin authentication.
 */

/**
 * @swagger
 * /api/admin/bill-submissions/health-report:
 *   get:
 *     summary: Get comprehensive health report for all variable recurring services
 *     tags: [Admin - Bill Submission Monitoring]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Health report generated successfully
 *       500:
 *         description: Server error
 */
router.get('/health-report', authenticateAdmin, catchAsync(billSubmissionMonitoringController.getHealthReport));

/**
 * @swagger
 * /api/admin/bill-submissions/critical-issues:
 *   get:
 *     summary: Get services with critical issues only
 *     tags: [Admin - Bill Submission Monitoring]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Critical issues retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/critical-issues', authenticateAdmin, catchAsync(billSubmissionMonitoringController.getCriticalIssues));

/**
 * @swagger
 * /api/admin/bill-submissions/dashboard:
 *   get:
 *     summary: Get monitoring dashboard summary
 *     tags: [Admin - Bill Submission Monitoring]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/dashboard', authenticateAdmin, catchAsync(billSubmissionMonitoringController.getDashboard));

/**
 * @swagger
 * /api/admin/bill-submissions/troubleshoot/{serviceId}:
 *   get:
 *     summary: Get troubleshooting report for a specific service
 *     tags: [Admin - Bill Submission Monitoring]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The service ID to troubleshoot
 *     responses:
 *       200:
 *         description: Troubleshooting report generated successfully
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.get('/troubleshoot/:serviceId', authenticateAdmin, catchAsync(billSubmissionMonitoringController.troubleshootService));

/**
 * @swagger
 * /api/admin/bill-submissions/diagnose/{serviceId}:
 *   post:
 *     summary: Run deep diagnostic analysis on a specific service
 *     tags: [Admin - Bill Submission Monitoring]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The service ID to diagnose
 *     responses:
 *       200:
 *         description: Deep diagnostic completed successfully
 *       404:
 *         description: Service not found
 *       500:
 *         description: Server error
 */
router.post('/diagnose/:serviceId', authenticateAdmin, catchAsync(billSubmissionMonitoringController.diagnoseSpecificService));

module.exports = router;

