// src/routes/partnerRoutes.js
const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Add a new partner
 *     tags: [Partners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rhythm Energy"
 *               description:
 *                 type: string
 *                 example: "Energy provider"
 *     responses:
 *       201:
 *         description: Partner added successfully
 */
router.post('/', partnerController.createPartner);

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: Get all partners
 *     tags: [Partners]
 *     responses:
 *       200:
 *         description: List of all partners
 */
router.get('/', partnerController.getAllPartners);

module.exports = router;
