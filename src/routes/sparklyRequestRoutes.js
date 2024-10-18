// routes/sparklyRequestRoutes.js
const express = require('express');
const router = express.Router();
const sparklyRequestController = require('../controllers/sparklyRequestController');

/**
 * @swagger
 * /partners/{id}/sparkly-request:
 *   post:
 *     summary: Create a SparklyRequest
 *     description: Create a new SparklyRequest and link it to a ServiceRequestBundle.
 *     tags: [Sparkly Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the partner (Sparkly)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               houseId:
 *                 type: integer
 *                 description: ID of the house making the request
 *                 example: 1
 *               userId:
 *                 type: integer
 *                 description: ID of the user submitting the request
 *                 example: 2
 *               num_rooms:
 *                 type: integer
 *                 description: Number of rooms in the house
 *                 example: 3
 *               house_size:
 *                 type: string
 *                 description: Size of the house (small, medium, large)
 *                 example: "medium"
 *               frequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly]
 *                 description: Frequency of the service
 *                 example: "weekly"
 *     responses:
 *       201:
 *         description: SparklyRequest created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sparkly request created successfully"
 *                 sparklyRequest:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID of the SparklyRequest
 *                     service_request_bundle_id:
 *                       type: integer
 *                       description: ID of the associated ServiceRequestBundle
 *                     house_id:
 *                       type: integer
 *                       description: ID of the house
 *                     user_id:
 *                       type: integer
 *                       description: ID of the user who submitted the request
 *                     num_rooms:
 *                       type: integer
 *                       description: Number of rooms in the house
 *                     house_size:
 *                       type: string
 *                       description: Size of the house
 *                     frequency:
 *                       type: string
 *                       description: Frequency of the service
 */
router.post('/:id/sparkly-request', sparklyRequestController.createSparklyRequest);

module.exports = router;
