// src/routes/houseServiceRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const houseServiceController = require('../controllers/houseServiceController');

/**
 * @swagger
 * /houses/{id}/services:
 *   post:
 *     summary: Add a service to a house
 *     tags: [HouseServices]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               partnerId:
 *                 type: integer
 *               servicePlanId:
 *                 type: integer
 *                 description: Optional, specific service plan to add to the house
 *               status:
 *                 type: string
 *                 example: "PENDING"
 *     responses:
 *       201:
 *         description: Service added successfully to the house
 */
router.post('/:id/services', houseServiceController.addServiceToHouse);

// Get all services for a house
router.get('/:id/services', houseServiceController.getServicesForHouse);

module.exports = router;
