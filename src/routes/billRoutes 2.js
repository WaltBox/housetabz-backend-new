const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

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
 *             properties:
 *               houseServiceId:
 *                 type: integer
 *               amount:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Bill created and charges distributed successfully
 */
router.post('/:houseId/bills', billController.createBill);


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
 *     responses:
 *       200:
 *         description: List of all bills for the house
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   houseId:
 *                     type: integer
 *                   amount:
 *                     type: integer
 *                   status:
 *                     type: boolean
 */
router.get('/:houseId/bills', billController.getBillsForHouse);

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
 *         description: The bill for the house
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 houseId:
 *                   type: integer
 *                 amount:
 *                   type: integer
 *                 status:
 *                   type: boolean
 */
router.get('/:houseId/bills/:billId', billController.getBillForHouse);

module.exports = router;
