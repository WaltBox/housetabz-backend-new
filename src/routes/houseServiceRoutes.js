console.log('🔥 HOUSE SERVICE ROUTES FILE LOADED');

const express = require('express');
const router = express.Router();
const houseServiceController = require('../controllers/houseServiceController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { requireOnboardingForHouse } = require('../middleware/onboardingProtection');

console.log('🔥 DEACTIVATE FUNCTION TYPE:', typeof houseServiceController.deactivateHouseService);

router.get('/house/:houseId/with-data', authenticateUser, requireOnboardingForHouse, houseServiceController.getHouseServicesWithLedgersAndSummaries);

router.get('/house/:houseId', authenticateUser, requireOnboardingForHouse, houseServiceController.getHouseServicesByHouseId);

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
// Test route to verify routing works
router.patch('/:serviceId/test', (req, res) => {
  console.log('🧪 TEST ROUTE HIT:', req.params);
  res.json({ message: 'Test route works', serviceId: req.params.serviceId });
});

// Deactivate a house service (only designated user) - MUST be before /:id route
router.patch('/:serviceId/deactivate', authenticateUser, houseServiceController.deactivateHouseService);

// Reactivate a house service (only designated user) - MUST be before /:id route
router.patch('/:serviceId/reactivate', authenticateUser, houseServiceController.reactivateHouseService);

// Create manual bill for a house service (only designated user) - MUST be before /:id route
router.post('/:serviceId/manual-bill', authenticateUser, houseServiceController.createManualBill);

router.get('/:id', houseServiceController.getHouseServiceById);

module.exports = router;
