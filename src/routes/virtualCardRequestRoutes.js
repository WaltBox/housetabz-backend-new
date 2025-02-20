// src/routes/virtualCardRequestRoutes.js
const express = require('express');
const router = express.Router();
const virtualCardRequestController = require('../controllers/virtualCardRequestController');
// const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * /virtual-card-requests:
 *   post:
 *     tags:
 *       - Virtual Card Requests
 *     summary: Create a new virtual card request
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
 *               - monthlyAmount
 *               - dueDate
 *               - userId
 *             properties:
 *               serviceName:
 *                 type: string
 *                 description: Name of the service (e.g., "AT&T", "Comcast")
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
 *                 description: Optional upfront payment amount (e.g., security deposit)
 *     responses:
 *       201:
 *         description: Virtual card request created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/',virtualCardRequestController.createVirtualCardRequest);

/**
 * @swagger
 * /virtual-card-requests:
 *   get:
 *     tags:
 *       - Virtual Card Requests
 *     summary: Get all virtual card requests
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
 *         description: List of virtual card requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VirtualCardRequest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', virtualCardRequestController.getVirtualCardRequests);

/**
 * @swagger
 * /virtual-card-requests/{id}:
 *   get:
 *     tags:
 *       - Virtual Card Requests
 *     summary: Get a specific virtual card request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Virtual card request ID
 *     responses:
 *       200:
 *         description: Virtual card request details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VirtualCardRequest'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Virtual card request not found
 *       500:
 *         description: Server error
 */
router.get('/:id',virtualCardRequestController.getVirtualCardRequestById);

/**
 * @swagger
 * /virtual-card-requests/{id}/status:
 *   put:
 *     tags:
 *       - Virtual Card Requests
 *     summary: Update virtual card request status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Virtual card request ID
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
 *                 description: New status for the virtual card request
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Virtual card request not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', virtualCardRequestController.updateVirtualCardRequestStatus);

/**
 * @swagger
 * components:
 *   schemas:
 *     VirtualCardRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The virtual card request ID
 *         serviceName:
 *           type: string
 *           description: Name of the service
 *         serviceType:
 *           type: string
 *           description: Type of service (always 'virtual_card')
 *         monthlyAmount:
 *           type: number
 *           description: Monthly amount for the service
 *         dueDate:
 *           type: integer
 *           description: Day of the month when payment is due
 *         requiredUpfrontPayment:
 *           type: number
 *           description: Required upfront payment amount
 *         virtualCardId:
 *           type: string
 *           description: Stripe virtual card ID
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