const express = require('express');
const partnerController = require('../controllers/partnerController');
const router = express.Router();

/**
 * @swagger
 * /partners/create:
 *   post:
 *     summary: Create a new partner
 *     description: Registers a new partner and generates API keys.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rhythm Energy"
 *               registration_code:
 *                 type: string
 *                 example: "RH-1234"
 *     responses:
 *       201:
 *         description: Partner created successfully
 */
router.post('/create', partnerController.createPartner);

/**
 * @swagger
 * /partners/stage-authorization:
 *   post:
 *     summary: Stage a service authorization
 *     description: Stages authorization for a service.
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               houseId:
 *                 type: integer
 *                 example: 1
 *               userId:
 *                 type: integer
 *                 example: 101
 *               transactionId:
 *                 type: string
 *                 example: "TXN-98765"
 *               serviceName:
 *                 type: string
 *                 example: "Electricity Plan"
 *               pricing:
 *                 type: number
 *                 example: 99.99
 *     responses:
 *       201:
 *         description: Authorization staged successfully
 */
router.post('/stage-authorization', partnerController.stageAuthorization);

module.exports = router;
