// routes/rhythmOfferRequestRoutes.js
const express = require('express');
const router = express.Router();
const { createRhythmOfferRequest } = require('../controllers/rhythmOfferRequestController');

/**
 * @swagger
 * /user/{user_id}/rhythm-offer-requests/{uuid}:
 *   post:
 *     summary: Create a new rhythm offer request
 *     tags: [RhythmOfferRequests]
 *     parameters:
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user making the request
 *       - in: path
 *         name: uuid
 *         schema:
 *           type: string
 *         required: true
 *         description: UUID of the offer snapshot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               house_id:
 *                 type: integer
 *                 example: 101
 *               security_deposit:
 *                 type: integer
 *                 example: 300
 *     responses:
 *       201:
 *         description: Rhythm offer request created successfully
 *       500:
 *         description: Server error
 */
router.post('/:user_id/rhythm-offer-requests/:uuid', createRhythmOfferRequest);

module.exports = router;
