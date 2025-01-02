const express = require('express');
const stagedRequestController = require('../controllers/stagedRequestController');
const router = express.Router();

/**
 * @swagger
 * /staged-request:
 *   post:
 *     summary: Create a staged request
 *     tags: [Staged Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               partnerName:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               serviceName:
 *                 type: string
 *               pricing:
 *                 type: number
 *               userId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Staged request created successfully
 */
router.post('/staged-request', stagedRequestController.createStagedRequest);

/**
 * @swagger
 * /staged-request/{id}/status:
 *   patch:
 *     summary: Update staged request status
 *     tags: [Staged Requests]
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
 *                 enum: [staged, authorized, declined]
 *     responses:
 *       200:
 *         description: Staged request status updated successfully
 */
router.patch('/staged-request/:id/status', stagedRequestController.updateStagedRequestStatus);

module.exports = router;
