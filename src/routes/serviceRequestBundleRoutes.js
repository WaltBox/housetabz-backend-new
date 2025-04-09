const express = require('express');
const serviceRequestBundleController = require('../controllers/serviceRequestBundleController');
const router = express.Router();

/**
 * @swagger
 * /service-request-bundles:
 *   post:
 *     summary: Create a service request bundle
 *     description: Creates a new service request bundle.
 *     tags: [Service Request Bundles]
 */
router.post('/', serviceRequestBundleController.createServiceRequestBundle);

/**
 * @swagger
 * /service-request-bundles:
 *   get:
 *     summary: Fetch all service request bundles
 *     description: Retrieves all service request bundles or filters by houseId.
 *     tags: [Service Request Bundles]
 */
router.get('/', serviceRequestBundleController.getServiceRequestBundles);

/**
 * @swagger
 * /service-request-bundles/{id}:
 *   get:
 *     summary: Fetch a specific service request bundle
 *     description: Retrieves a single service request bundle by ID.
 *     tags: [Service Request Bundles]
 */
router.get('/:id', serviceRequestBundleController.getServiceRequestBundleById);

/**
 * @swagger
 * /service-request-bundles/{id}:
 *   patch:
 *     summary: Update the status of a service request bundle
 *     description: Updates the status of a service request bundle.
 *     tags: [Service Request Bundles]
 */
router.patch('/:id', serviceRequestBundleController.updateServiceRequestBundle);

/**
 * @swagger
 * /service-request-bundles/{id}:
 *   delete:
 *     summary: Delete a service request bundle
 *     description: Deletes a service request bundle by ID.
 *     tags: [Service Request Bundles]
 */
router.delete('/:id', serviceRequestBundleController.deleteServiceRequestBundle);

module.exports = router;
