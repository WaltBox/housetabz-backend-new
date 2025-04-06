// src/routes/billSubmissionRoutes.js
const express = require('express');
const router = express.Router();
const billSubmissionController = require('../controllers/billSubmissionController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * @swagger
 * /api/users/{userId}/bill-submissions:
 *   get:
 *     summary: Get pending bill submissions for a user
 *     description: Retrieves all pending bill submissions that need to be completed by a specific user
 *     tags: [Bill Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of pending bill submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pending bill submissions found
 *                 submissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       houseServiceId:
 *                         type: integer
 *                         example: 3
 *                       userId:
 *                         type: integer
 *                         example: 6
 *                       status:
 *                         type: string
 *                         example: pending
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       houseService:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 3
 *                           name:
 *                             type: string
 *                             example: Austin Energy
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get(
    '/users/:userId/bill-submissions',
    authenticateUser,
    catchAsync(billSubmissionController.getPendingSubmissionsForUser)
  );
  

/**
 * @swagger
 * /api/bill-submissions/{submissionId}/submit:
 *   post:
 *     summary: Submit a bill amount
 *     description: Submit the amount for a variable recurring bill
 *     tags: [Bill Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The bill submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 86.42
 *                 description: The amount of the bill
 *     responses:
 *       200:
 *         description: Bill amount submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bill amount submitted successfully
 *                 billSubmission:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: completed
 *                     amount:
 *                       type: number
 *                       example: 86.42
 *                 bill:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 42
 *                     amount:
 *                       type: number
 *                       example: 86.42
 *                     name:
 *                       type: string
 *                       example: Austin Energy
 *                 charges:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 123
 *                       userId:
 *                         type: integer
 *                         example: 6
 *                       amount:
 *                         type: number
 *                         example: 28.81
 *       400:
 *         description: Invalid input or submission already completed
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Bill submission not found
 *       500:
 *         description: Server error
 */
router.post(
    '/bill-submissions/:submissionId/submit',
    authenticateUser,
    catchAsync(billSubmissionController.submitBillAmount)
  );

module.exports = router;