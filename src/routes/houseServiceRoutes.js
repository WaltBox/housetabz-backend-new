const express = require('express');
const router = express.Router();
const houseServiceController = require('../controllers/houseServiceController');

router.get('/house/:houseId', houseServiceController.getHouseServicesByHouseId);

/**
 * @swagger
 * tags:
 *   name: HouseService
 *   description: API for managing House Services
 */

/**
 * @swagger
 * /houseServices:
 *   post:
 *     summary: Create a new HouseService
 *     tags: [HouseService]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - houseId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the service.
 *                 example: "Cleaning"
 *               status:
 *                 type: string
 *                 description: The status of the service. Defaults to "pending" if not provided.
 *                 example: "pending"
 *               type:
 *                 type: string
 *                 description: The type of service provided.
 *                 example: "maintenance"
 *               houseId:
 *                 type: integer
 *                 description: The ID of the associated house.
 *                 example: 123
 *     responses:
 *       201:
 *         description: HouseService created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: HouseService created successfully
 *                 houseService:
 *                   $ref: '#/components/schemas/HouseService'
 *       500:
 *         description: Failed to create HouseService
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', houseServiceController.createHouseService);

/**
 * @swagger
 * /houseServices:
 *   get:
 *     summary: Retrieve all HouseServices
 *     tags: [HouseService]
 *     responses:
 *       200:
 *         description: A list of HouseServices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HouseService'
 *       500:
 *         description: Failed to fetch HouseServices
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', houseServiceController.getAllHouseServices);

/**
 * @swagger
 * /houseServices/{id}:
 *   get:
 *     summary: Retrieve a HouseService by ID
 *     tags: [HouseService]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The HouseService ID
 *     responses:
 *       200:
 *         description: A HouseService object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HouseService'
 *       404:
 *         description: HouseService not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', houseServiceController.getHouseServiceById);

module.exports = router;
