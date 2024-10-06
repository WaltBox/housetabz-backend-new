// src/routes/servicePlanRoutes.js
const express = require('express');
const router = express.Router();
const servicePlanController = require('../controllers/servicePlanController');

/**
 * @swagger
 * /service-plans:
 *   post:
 *     summary: Create a new service plan
 *     tags: [ServicePlans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Basic Energy Plan"
 *               price:
 *                 type: string
 *                 example: "50"
 *               details:
 *                 type: string
 *                 example: "Basic energy plan for small households"
 *               partnerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Service plan added successfully
 */
router.post('/', servicePlanController.createServicePlan);

module.exports = router;
