// src/routes/servicePlanRoutes.js
const express = require('express');
const router = express.Router();
const servicePlanController = require('../controllers/servicePlanController');

/**
 * @swagger
 * /partners/{partnerId}/service-plans:
 *   post:
 *     summary: Create a new service plan for a specific partner
 *     tags: [ServicePlans]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service plan added successfully
 */
router.post('/partners/:partnerId/service-plans', servicePlanController.createServicePlan);

/**
 * @swagger
 * /partners/{partnerId}/service-plans:
 *   get:
 *     summary: Get all service plans for a specific partner
 *     tags: [ServicePlans]
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The partner ID
 *     responses:
 *       200:
 *         description: List of all service plans for the partner
 */
router.get('/partners/:partnerId/service-plans', servicePlanController.getServicePlansForPartner);

module.exports = router;
