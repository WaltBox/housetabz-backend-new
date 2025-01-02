const express = require('express');
const serviceRequestBundleController = require('../controllers/serviceRequestBundleController');
const router = express.Router();

/**
 * @swagger
 * /service-request-bundle:
 *   post:
 *     summary: Create a service request bundle
 *     description: Creates a new service request bundle.
 *     tags: [Service Request Bundles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 101
 *               stagedRequestId:
 *                 type: integer
 *                 example: 1001
 *     responses:
 *       201:
 *         description: Service request bundle created successfully
 */
router.post('/service-request-bundle', serviceRequestBundleController.createServiceRequestBundle);

/**
 * @swagger
 * /service-request-bundle:
 *   get:
 *     summary: Fetch all service request bundles
 *     description: Retrieves all service request bundles or filters by houseId.
 *     tags: [Service Request Bundles]
 *     parameters:
 *       - in: query
 *         name: houseId
 *         schema:
 *           type: integer
 *         description: The house ID to filter bundles
 *     responses:
 *       200:
 *         description: Successfully retrieved service request bundles
 */
router.get('/service-request-bundle', serviceRequestBundleController.getServiceRequestBundles);

/**
 * @swagger
 * /service-request-bundle/{id}:
 *   get:
 *     summary: Fetch a specific service request bundle
 *     description: Retrieves a single service request bundle by ID.
 *     tags: [Service Request Bundles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved service request bundle
 */
router.get('/service-request-bundle/:id', serviceRequestBundleController.getServiceRequestBundleById);

/**
 * @swagger
 * /service-request-bundle/{id}:
 *   patch:
 *     summary: Update the status of a service request bundle
 *     description: Updates the status of a service request bundle.
 *     tags: [Service Request Bundles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, authorized, declined]
 *     responses:
 *       200:
 *         description: Successfully updated service request bundle
 */
router.patch('/service-request-bundle/:id', serviceRequestBundleController.updateServiceRequestBundle);

/**
 * @swagger
 * /service-request-bundle/{id}:
 *   delete:
 *     summary: Delete a service request bundle
 *     description: Deletes a service request bundle by ID.
 *     tags: [Service Request Bundles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully deleted service request bundle
 */
router.delete('/service-request-bundle/:id', serviceRequestBundleController.deleteServiceRequestBundle);

module.exports = router;
