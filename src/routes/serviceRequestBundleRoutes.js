const express = require('express');
const router = express.Router();
const serviceRequestBundleController = require('../controllers/serviceRequestBundleController');

// Swagger documentation for creating a service request bundle
/**
 * @swagger
 * /service-request-bundle:
 *   post:
 *     summary: Create a service request bundle
 *     description: Creates a new service request bundle for the house.
 *     tags: [Service Request Bundles]
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
 *               status:
 *                 type: string
 *                 description: Status of the service request
 *                 example: "pending"
 *     responses:
 *       201:
 *         description: Service request bundle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service request bundle created successfully"
 *                 serviceRequestBundle:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: Unique identifier for the service request bundle
 *                     houseId:
 *                       type: integer
 *                       description: ID of the house associated with the request
 *                     userId:
 *                       type: integer
 *                       description: ID of the user who submitted the request
 *                     status:
 *                       type: string
 *                       description: Status of the service request
 *                       example: "pending"
 */

// POST route to create a service request bundle
router.post('/service-request-bundle', serviceRequestBundleController.createServiceRequestBundle);

// Swagger documentation for retrieving service request bundles
/**
 * @swagger
 * /service-request-bundle:
 *   get:
 *     summary: Retrieve service request bundles
 *     description: Fetches all service request bundles for a given house.
 *     tags: [Service Request Bundles]
 *     parameters:
 *       - in: query
 *         name: houseId
 *         schema:
 *           type: integer
 *           example: 1
 *         required: true
 *         description: ID of the house to fetch service request bundles for
 *     responses:
 *       200:
 *         description: Service request bundles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Service request bundles retrieved successfully"
 *                 serviceRequests:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Unique identifier for the service request bundle
 *                       houseId:
 *                         type: integer
 *                         description: ID of the house associated with the request
 *                       userId:
 *                         type: integer
 *                         description: ID of the user who submitted the request
 *                       status:
 *                         type: string
 *                         description: Status of the service request
 *                         example: "pending"
 */

// GET route for retrieving service request bundles
router.get('/service-request-bundle', serviceRequestBundleController.getServiceRequestBundles);

module.exports = router;
