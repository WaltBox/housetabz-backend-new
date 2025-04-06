// src/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const {authenticateSystem} = require('../middleware/auth/systemAuth');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Internet Bill"
 *         amount:
 *           type: number
 *           format: float
 *           example: 89.99
 *         status:
 *           type: string
 *           enum: [pending, partial_paid, paid]
 *           example: "pending"
 *         billType:
 *           type: string
 *           enum: [regular, fixed_recurring, variable_recurring]
 *           example: "regular"
 *         dueDate:
 *           type: string
 *           format: date
 *           example: "2025-03-01"
 *     Charge:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 2
 *         amount:
 *           type: number
 *           format: float
 *           example: 29.99
 *         status:
 *           type: string
 *           enum: [pending, paid]
 *           example: "pending"
 */

/**
 * @swagger
 * /houses/{houseId}/bills:
 *   post:
 *     summary: Create a new bill and distribute charges
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - houseServiceId
 *               - amount
 *             properties:
 *               houseServiceId:
 *                 type: integer
 *                 example: 1
 *                 description: ID of the house service this bill is for
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 89.99
 *                 description: The bill amount
 *               billType:
 *                 type: string
 *                 enum: [regular, fixed_recurring, variable_recurring]
 *                 example: "regular"
 *                 description: Type of bill (optional)
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-03-01"
 *                 description: When the bill is due (optional)
 *     responses:
 *       201:
 *         description: Bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bill, charges, and notifications created successfully"
 *                 bill:
 *                   $ref: '#/components/schemas/Bill'
 *                 charges:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Charge'
 *       400:
 *         description: Bad request - Invalid input data
 *       404:
 *         description: House or service not found
 *       500:
 *         description: Server error
 */
router.post('/:houseId/bills', authenticateSystem, catchAsync(billController.createBill));

/**
 * @swagger
 * /houses/{houseId}/bills:
 *   get:
 *     summary: Get all bills for a specific house
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *       - in: query
 *         name: billType
 *         schema:
 *           type: string
 *           enum: [regular, fixed_recurring, variable_recurring]
 *         description: Filter bills by type (optional)
 *     responses:
 *       200:
 *         description: List of bills retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bill'
 *       404:
 *         description: House not found
 */
router.get('/:houseId/bills', authenticateUser, catchAsync(billController.getBillsForHouse));

router.get('/:houseId/paid-bills', authenticateUser, catchAsync(billController.getPaidBillsForHouse));
/**
 * @swagger
 * /houses/{houseId}/bills/{billId}:
 *   get:
 *     summary: Get a specific bill for a specific house
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *       - in: path
 *         name: billId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The bill ID
 *     responses:
 *       200:
 *         description: Bill retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bill'
 *       404:
 *         description: House or bill not found
 */
router.get('/:houseId/bills/:billId', authenticateUser, catchAsync(billController.getBillForHouse));


/**
 * @swagger
 * /houses/{houseId}/generate-fixed-bills:
 *   post:
 *     summary: Generate bills for fixed recurring services
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: houseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID (use 0 for all houses)
 *     responses:
 *       200:
 *         description: Bills generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processedCount:
 *                   type: integer
 *                   example: 3
 *                 successCount:
 *                   type: integer
 *                   example: 2
 *                 failureCount:
 *                   type: integer
 *                   example: 1
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceId:
 *                         type: integer
 *                       serviceName:
 *                         type: string
 *                       success:
 *                         type: boolean
 */
router.post('/:houseId/generate-fixed-bills', authenticateSystem, catchAsync(billController.generateFixedBills));

/**
 * @swagger
 * /user/variable-services:
 *   get:
 *     summary: Get all variable services for which the user is designated
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: Variable services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 */
router.get('/user/variable-services', authenticateUser, catchAsync(billController.getUserVariableServices));

/**
 * @swagger
 * /services/{serviceId}/submit-bill:
 *   post:
 *     summary: Submit a variable bill amount
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the variable service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - userId
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 125.50
 *               userId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Variable bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bill:
 *                   $ref: '#/components/schemas/Bill'
 */
router.post('/services/:serviceId/submit-bill', authenticateUser, catchAsync(billController.submitVariableBillAmount));

/**
 * @swagger
 * /generate-variable-reminders:
 *   post:
 *     summary: Generate reminders for variable service bills
 *     tags: [Bills]
 *     responses:
 *       200:
 *         description: Reminders generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processedCount:
 *                   type: integer
 *                 successCount:
 *                   type: integer
 *                 failureCount:
 *                   type: integer
 */
router.post('/generate-variable-reminders', authenticateSystem, catchAsync(billController.generateVariableReminders));

module.exports = router;