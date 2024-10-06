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
 *                 description: The ID of the partner providing the service
 *               servicePlanId:
 *                 type: integer
 *                 description: Optional, specific service plan to add to the house
 *               status:
 *                 type: string
 *                 example: "PENDING"
 *                 description: The status of the service request
 *     responses:
 *       201:
 *         description: Service added successfully to the house
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service added successfully to the house"
 *                 houseService:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     houseId:
 *                       type: integer
 *                     partnerId:
 *                       type: integer
 *                     servicePlanId:
 *                       type: integer
 *                       nullable: true
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 */

/**
 * @swagger
 * /houses/{id}/services:
 *   get:
 *     summary: Get all services for a specific house
 *     tags: [HouseServices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     responses:
 *       200:
 *         description: List of all services associated with the house
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
 *                   partnerId:
 *                     type: integer
 *                   servicePlanId:
 *                     type: integer
 *                     nullable: true
 *                   status:
 *                     type: string
 *                   Partner:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                   ServicePlan:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       price:
 *                         type: string
 *                       details:
 *                         type: string
 */
router.post('/:id/services', houseServiceController.addServiceToHouse);
router.get('/:id/services', houseServiceController.getServicesForHouse);

module.exports = router;
