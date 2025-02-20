// src/routes/takeOverRequestRoutes.js
const express = require('express');
const router = express.Router();
const takeOverRequestController = require('../controllers/takeOverRequestController');

/**
 * @swagger
 * /take-over-requests:
 *   post:
 *     tags:
 *       - Take Over Requests
 *     summary: Create a new take over request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *               - accountNumber
 *               - monthlyAmount
 *               - dueDate
 *               - userId
 *             properties:
 *               serviceName:
 *                 type: string
 *                 description: Name of the service (e.g., "AT&T", "Comcast")
 *               accountNumber:
 *                 type: string
 *                 description: Account number for the existing service
 *               monthlyAmount:
 *                 type: number
 *                 format: float
 *                 description: Monthly amount for the service
 *               dueDate:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 31
 *                 description: Day of the month when payment is due
 *               userId:
 *                 type: integer
 *                 description: ID of the user creating the request
 *               requiredUpfrontPayment:
 *                 type: number
 *                 format: float
 *                 description: Optional upfront payment amount
 *     responses:
 *       201:
 *         description: Take over request created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', takeOverRequestController.createTakeOverRequest);

/**
 * @swagger
 * /take-over-requests:
 *   get:
 *     tags:
 *       - Take Over Requests
 *     summary: Get all take over requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: houseId
 *         schema:
 *           type: integer
 *         description: Filter requests by house ID
 *     responses:
 *       200:
 *         description: List of take over requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TakeOverRequest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', takeOverRequestController.getTakeOverRequests);

/**
 * @swagger
 * /take-over-requests/{id}:
 *   get:
 *     tags:
 *       - Take Over Requests
 *     summary: Get a specific take over request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Take over request ID
 *     responses:
 *       200:
 *         description: Take over request details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TakeOverRequest'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Take over request not found
 *       500:
 *         description: Server error
 */
router.get('/:id', takeOverRequestController.getTakeOverRequestById);

/**
 * @swagger
 * /take-over-requests/{id}/status:
 *   put:
 *     tags:
 *       - Take Over Requests
 *     summary: Update take over request status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Take over request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, active, cancelled]
 *                 description: New status for the take over request
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Take over request not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', takeOverRequestController.updateTakeOverRequestStatus);

/**
 * @swagger
 * components:
 *   schemas:
 *     TakeOverRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The take over request ID
 *         serviceName:
 *           type: string
 *           description: Name of the service
 *         accountNumber:
 *           type: string
 *           description: Account number for the service
 *         serviceType:
 *           type: string
 *           description: Type of service (always 'take_over')
 *         monthlyAmount:
 *           type: number
 *           description: Monthly amount for the service
 *         dueDate:
 *           type: integer
 *           description: Day of the month when payment is due
 *         requiredUpfrontPayment:
 *           type: number
 *           description: Required upfront payment amount
 *         status:
 *           type: string
 *           enum: [pending, active, cancelled]
 *           description: Current status of the request
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

module.exports = router;