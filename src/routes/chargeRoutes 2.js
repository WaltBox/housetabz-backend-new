const express = require('express');
const router = express.Router({ mergeParams: true });
const chargeController = require('../controllers/chargeController');

/**
 * @swagger
 * /users/{userId}/charges:
 *   get:
 *     summary: Get all charges for a specific user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of all charges for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   userId:
 *                     type: integer
 *                   amount:
 *                     type: integer
 *                   paid:
 *                     type: boolean
 */
router.get('/:userId/charges', chargeController.getChargesForUser);


/**
 * @swagger
 * /users/{userId}/charges/{id}:
 *   get:
 *     summary: Get a specific charge by its ID for a user
 *     tags: [Charges]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The user ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The charge ID
 *     responses:
 *       200:
 *         description: The specific charge details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 userId:
 *                   type: integer
 *                 amount:
 *                   type: number
 *                 paid:
 *                   type: boolean
 *       404:
 *         description: Charge not found
 */
router.get('/:userId/charges/:id', chargeController.getChargeById);

module.exports = router;
