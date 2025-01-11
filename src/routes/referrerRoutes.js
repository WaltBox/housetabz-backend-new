const express = require('express');
const router = express.Router();
const referrerController = require('../controllers/referrerController');

/**
 * @swagger
 * /referral-program:
 *   post:
 *     summary: Generate a referral link for a user
 *     tags: [Referrer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Referral link created successfully
 *       409:
 *         description: Email already exists
 *       400:
 *         description: Name or email missing
 */
router.post('/', referrerController.generateReferralLink);

module.exports = router;
